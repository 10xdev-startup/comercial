import { loadBusinessConfig } from '@/config/business'
import { loadAgentLimits } from '@/config/limits'
import { monthlySpendExceedsBudget } from '@/domain/budget'
import { canSendViaBrowser, channelAfterBrowserSend } from '@/domain/channel'
import { findBlockedClaim } from '@/domain/claims'
import { isWithinOperatingHours, secondsBetweenDms, wouldExceedDailyCap } from '@/domain/rateLimit'
import { createCdpClient, withBrowserMutex } from '@/integrations/browser'
import { sendFirstDmOnPage } from '@/integrations/browser/fakeCdp'
import { BrowserUnavailableError } from '@/integrations/browser/types'
import { extractInboundMessages } from '@/integrations/instagram/signature'
import { decideOnInbound } from '@/integrations/openai/decide'
import { DoNotContactModel } from '@/models/DoNotContactModel'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { AiUsageModel, SystemStateModel } from '@/models/SystemStateModel'
import { reportError } from '@/services/errorReporting'
import type { Job } from '@/types/job'

const WORKER_ID = `worker-${process.pid}`
const STALE_MS = 5 * 60 * 1000

export async function recoverAndTick(now = new Date()): Promise<'idle' | 'ran' | 'skipped'> {
  await JobModel.recoverStuck(STALE_MS, now)
  return tickOnce(now)
}

export async function tickOnce(now = new Date()): Promise<'idle' | 'ran' | 'skipped'> {
  const job = await JobModel.claimNext(WORKER_ID, now)
  if (!job) return 'idle'
  try {
    const outcome = await handleJob(job, now)
    if (outcome === 'reschedule') {
      const delay = secondsBetweenDms(loadAgentLimits().minSecondsBetweenDms, loadAgentLimits().maxSecondsBetweenDms)
      await JobModel.reschedule(job.id, new Date(now.getTime() + delay * 1000).toISOString(), 'rescheduled')
      return 'skipped'
    }
    await JobModel.finish(job.id, 'succeeded')
    return 'ran'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    void reportError({ context: `worker:${job.type}`, error: err })
    if (job.attempts >= job.maxAttempts) {
      await JobModel.finish(job.id, 'dead_letter', message)
    } else {
      await JobModel.finish(job.id, 'failed', message)
    }
    return 'ran'
  }
}

async function handleJob(job: Job, now: Date): Promise<'ok' | 'reschedule'> {
  if (job.type === 'send_first_dm') return handleSendFirstDm(job, now)
  if (job.type === 'process_inbound') {
    await handleProcessInbound(job)
    return 'ok'
  }
  if (job.type === 'follow_up') return 'reschedule'
  return 'ok'
}

async function handleSendFirstDm(job: Job, now: Date): Promise<'ok' | 'reschedule'> {
  const leadId = job.payload.leadId
  if (!leadId) throw new Error('send_first_dm missing leadId')
  const lead = await LeadModel.findById(leadId)
  if (!lead) throw new Error(`Lead not found: ${leadId}`)

  const system = await SystemStateModel.get()
  if (system.paused) return 'reschedule'

  if (await DoNotContactModel.has(lead.instagramHandle)) {
    await LeadModel.update(lead.id, { channelState: 'do_not_contact', pipelineState: 'closed' })
    return 'ok'
  }

  if (!canSendViaBrowser(lead.channelState)) {
    return 'ok'
  }

  const limits = loadAgentLimits()
  if (!isWithinOperatingHours(now, limits.operatingHours, limits.operatingTimezone)) {
    return 'reschedule'
  }

  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const sentToday = await LeadModel.countBrowserDmsSince(startOfDay)
  if (wouldExceedDailyCap(sentToday, limits.maxDmsPerDay)) return 'reschedule'

  const lastAt = await LeadModel.lastBrowserOutboundAt()
  if (lastAt) {
    const elapsed = (now.getTime() - Date.parse(lastAt)) / 1000
    if (elapsed < limits.minSecondsBetweenDms) return 'reschedule'
  }

  const spent = await AiUsageModel.monthSpendUsd(now)
  if (monthlySpendExceedsBudget(spent, limits.openaiMonthlyBudgetUsd)) {
    await SystemStateModel.setPaused(true, 'openai_budget')
    return 'reschedule'
  }

  const config = loadBusinessConfig()
  const text =
    job.payload.text ??
    `Oi${lead.displayName ? ` ${lead.displayName.split(' ')[0]}` : ''}, sou ${config.ownerName}. ${config.oneLinePitch}`
  const blocked = findBlockedClaim(text, config)
  if (blocked) throw new Error(`Blocked unverified claim: ${blocked}`)

  return withBrowserMutex(async () => {
    let client: Awaited<ReturnType<typeof createCdpClient>>['client'] | undefined
    try {
      const created = await createCdpClient()
      client = created.client
      await client.connect()
      const page = await client.newPage()
      try {
        const result = await sendFirstDmOnPage(page, lead.instagramHandle, text, {
          dryRun: job.payload.dryRun === true || created.dryRun,
        })
        const conversation = await LeadModel.getOrCreateConversation(lead.id)
        await LeadModel.setConversationOwner(conversation.id, 'browser')
        await LeadModel.addMessage({
          conversationId: conversation.id,
          leadId: lead.id,
          direction: 'outbound',
          source: 'browser',
          body: text,
          variant: job.payload.variant ?? null,
          jobId: job.id,
          externalId: null,
        })
        const nextPipeline = lead.pipelineState === 'discovered' || lead.pipelineState === 'qualified' ? 'contacted' : lead.pipelineState
        await LeadModel.update(lead.id, {
          pipelineState: nextPipeline,
          channelState: channelAfterBrowserSend(lead.channelState),
          lastContactedAt: now.toISOString(),
          nextAction: 'wait_reply',
        })
        if (!result.sent) {
          await LeadModel.addMessage({
            conversationId: conversation.id,
            leadId: lead.id,
            direction: 'outbound',
            source: 'system',
            body: 'Dry-run: mensagem composta, envio final bloqueado.',
            variant: null,
            jobId: job.id,
            externalId: null,
          })
        }
        return 'ok' as const
      } finally {
        await page.close()
      }
    } catch (err) {
      if (err instanceof BrowserUnavailableError) {
        await SystemStateModel.setPaused(true, 'browser_unavailable')
      }
      throw err
    } finally {
      if (client) await client.close()
    }
  })
}

async function handleProcessInbound(job: Job): Promise<void> {
  const payload = job.payload
  const text = payload.text ?? ''
  const leadId = payload.leadId
  if (!leadId) throw new Error('process_inbound missing leadId')
  const lead = await LeadModel.findById(leadId)
  if (!lead) throw new Error(`Lead not found: ${leadId}`)

  const decision = await decideOnInbound(text, lead.id)
  if (decision.intent === 'opt_out') {
    await DoNotContactModel.add(lead.instagramHandle, 'opt_out', 'inbound')
    await LeadModel.update(lead.id, { pipelineState: 'closed', channelState: 'do_not_contact' })
  }
}

export async function ingestWebhookPayload(payload: unknown): Promise<{ ingested: number }> {
  const events = extractInboundMessages(payload)
  let ingested = 0
  for (const event of events) {
    const duplicate = await LeadModel.findMessageByExternalId(event.externalId)
    if (duplicate) continue

    let lead = await LeadModel.findByMetaIgsid(event.igsid)
    if (!lead && event.handle) lead = await LeadModel.findByHandle(event.handle)
    if (!lead) continue

    const conversation = await LeadModel.getOrCreateConversation(lead.id)
    const message = await LeadModel.addMessage({
      conversationId: conversation.id,
      leadId: lead.id,
      direction: 'inbound',
      source: 'api',
      body: event.text,
      variant: null,
      jobId: null,
      externalId: event.externalId,
    })

    const windowExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await LeadModel.setConversationOwner(conversation.id, 'api', windowExpires)
    const nextPipeline =
      lead.pipelineState === 'contacted' || lead.pipelineState === 'qualified' || lead.pipelineState === 'discovered'
        ? 'replied'
        : lead.pipelineState
    await LeadModel.update(lead.id, {
      pipelineState: nextPipeline,
      channelState: 'api_active',
      metaIgsid: event.igsid,
    })
    await JobModel.enqueue({
      type: 'process_inbound',
      payload: { leadId: lead.id, text: event.text, messageId: message.id },
      idempotencyKey: `inbound:${event.externalId}`,
    })
    ingested += 1
  }
  return { ingested }
}

let timer: NodeJS.Timeout | null = null

export function startWorkerLoop(): void {
  if (timer) return
  const pollMs = loadAgentLimits().workerPollMs
  const tick = (): void => {
    void recoverAndTick().catch((err) => {
      void reportError({ context: 'worker:loop', error: err })
    })
  }
  tick()
  timer = setInterval(tick, pollMs)
  if (typeof timer.unref === 'function') timer.unref()
}

export function stopWorkerLoop(): void {
  if (!timer) return
  clearInterval(timer)
  timer = null
}
