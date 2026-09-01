import { performFirstContact } from '@/browser/firstContact'
import { loadBusinessConfig } from '@/config/business'
import { browserMaySend, apiMaySend, isMessagingWindowOpen, SKIPPED_API_WINDOW, SKIPPED_CHANNEL_LOCK } from '@/domain/channelLock'
import { canTransitionPipeline } from '@/domain/pipeline'
import { sendOfficialReply } from '@/integrations/instagram/graphApi'
import { parseIgsid } from '@/integrations/instagram/inbound'
import { interpretAndDecide } from '@/integrations/openai/engine'
import { AiUsageModel } from '@/models/AiUsageModel'
import { ExperimentModel } from '@/models/ExperimentModel'
import { LeadModel } from '@/models/LeadModel'
import { DoNotContactModel, SystemStateModel } from '@/models/SystemStateModel'
import { recordCircuitEvent } from '@/observability/circuitBreaker'
import { logEvent } from '@/observability/logger'
import type { Lead } from '@/types/crm'
import {
  SKIPPED_BROWSER_BUSY,
  SKIPPED_DO_NOT_CONTACT,
  SKIPPED_LEAD_NOT_FOUND,
  SKIPPED_MISSING_IGSID,
  SKIPPED_OPENAI_BUDGET,
  type Job,
} from '@/types/job'
import { releaseBrowserMutex, tryAcquireBrowserMutex } from '@/worker/browserMutex'

export type JobResult = { outcome: 'completed' } | { outcome: 'skipped'; reason: string }

function completed(): JobResult {
  return { outcome: 'completed' }
}

function skipped(reason: string): JobResult {
  return { outcome: 'skipped', reason }
}

function firstContactCopy(lead: Lead, payloadBody: string | undefined): string {
  if (payloadBody && payloadBody.trim()) return payloadBody.trim()
  const config = loadBusinessConfig()
  return `Olá! Aqui é ${config.ownerName} da ${config.companyName}. ${config.oneLinePitch}`
}

async function markDoNotContact(lead: Lead, reason: string, source: string): Promise<void> {
  if (!(await DoNotContactModel.has(lead.instagramHandle))) {
    await DoNotContactModel.add(lead.instagramHandle, reason, source)
  }
  const patch: { channelState: Lead['channelState']; pipelineState?: Lead['pipelineState'] } = {
    channelState: 'do_not_contact',
  }
  if (lead.pipelineState !== 'closed' && canTransitionPipeline(lead.pipelineState, 'closed')) {
    patch.pipelineState = 'closed'
  }
  await LeadModel.update(lead.id, patch)
}

async function handleRecordTimeline(job: Job): Promise<JobResult> {
  const leadId = job.payload.leadId
  const body = job.payload.body
  if (!leadId || !body) throw new Error('record_timeline requires leadId and body')
  const lead = await LeadModel.findById(leadId)
  if (!lead) throw new Error(`Lead not found: ${leadId}`)
  if (await DoNotContactModel.has(lead.instagramHandle)) {
    await markDoNotContact(lead, 'do_not_contact', 'record_timeline')
    return skipped(SKIPPED_DO_NOT_CONTACT)
  }
  await LeadModel.appendMessage({
    leadId: lead.id,
    body,
    direction: job.payload.direction ?? 'outbound',
    source: job.payload.source ?? 'system',
    jobId: job.id,
  })
  return completed()
}

async function assignRunningExperiment(lead: Lead): Promise<Lead> {
  if (lead.experimentId) return lead
  const running = (await ExperimentModel.list()).find((experiment) => experiment.status === 'running')
  if (!running) return lead
  const variant = ExperimentModel.assignVariant(running, lead.id)
  return LeadModel.update(lead.id, { experimentId: running.id, experimentVariant: variant })
}

async function handleSendFirstDm(job: Job): Promise<JobResult> {
  const leadId = job.payload.leadId
  if (!leadId) throw new Error('send_first_dm requires leadId')
  const lead = await LeadModel.findById(leadId)
  if (!lead) throw new Error(`Lead not found: ${leadId}`)
  if (await DoNotContactModel.has(lead.instagramHandle) || lead.channelState === 'do_not_contact') {
    logEvent('send_skipped_dnc', { leadId, type: job.type })
    return skipped(SKIPPED_DO_NOT_CONTACT)
  }

  const conversation = await LeadModel.getOrCreateConversation(lead.id)
  if (!browserMaySend(conversation.channelOwner)) {
    logEvent('send_skipped_channel_lock', { leadId, owner: conversation.channelOwner, via: 'browser' })
    return skipped(SKIPPED_CHANNEL_LOCK)
  }

  if (!tryAcquireBrowserMutex()) return skipped(SKIPPED_BROWSER_BUSY)

  try {
    const attributed = await assignRunningExperiment(lead)
    const body = firstContactCopy(attributed, job.payload.body)
    const result = await performFirstContact({ handle: attributed.instagramHandle, body })
    const recorded = result.dryRun ? `[dry-run] ${body}` : body
    await LeadModel.appendMessage({
      leadId: attributed.id,
      body: recorded,
      direction: 'outbound',
      source: 'browser',
      jobId: job.id,
    })
    const contactedPatch: { pipelineState?: Lead['pipelineState']; channelState: Lead['channelState']; lastContactedAt: string } = {
      channelState: 'waiting_inbound_reply',
      lastContactedAt: new Date().toISOString(),
    }
    if (attributed.pipelineState === 'discovered' || attributed.pipelineState === 'qualified') {
      contactedPatch.pipelineState = 'contacted'
    }
    await LeadModel.update(attributed.id, contactedPatch)
    await LeadModel.updateConversation(attributed.id, { channelOwner: 'browser' })
    logEvent('first_contact', {
      outcome: result.dryRun ? 'dry_run' : 'sent',
      liveInstagram: result.sent,
      leadId,
      handle: attributed.instagramHandle,
      actions: result.actions,
    })
    return completed()
  } catch (err) {
    await handleBrowserFailure(err)
    throw err
  } finally {
    releaseBrowserMutex()
  }
}

async function handleBrowserFailure(err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err)
  if (message.startsWith('instagram_restriction')) {
    await recordCircuitEvent('restriction')
    return
  }
  if (message.startsWith('browser_unavailable')) {
    logEvent('browser_unavailable', { error: message })
    await SystemStateModel.setPaused(true, 'browser_unavailable')
  }
}

async function handleFollowUp(job: Job): Promise<JobResult> {
  const leadId = job.payload.leadId
  if (!leadId) throw new Error('follow_up requires leadId')
  const lead = await LeadModel.findById(leadId)
  if (!lead) throw new Error(`Lead not found: ${leadId}`)
  if (await DoNotContactModel.has(lead.instagramHandle) || lead.channelState === 'do_not_contact') {
    return skipped(SKIPPED_DO_NOT_CONTACT)
  }

  const conversation = await LeadModel.getOrCreateConversation(lead.id)
  if (apiMaySend(conversation.channelOwner)) {
    return sendViaOfficialApi(lead, job, conversation.messagingWindowExpiresAt)
  }
  if (!browserMaySend(conversation.channelOwner)) {
    return skipped(SKIPPED_CHANNEL_LOCK)
  }
  logEvent('follow_up_browser_stub', { leadId, handle: lead.instagramHandle })
  return completed()
}

async function sendViaOfficialApi(lead: Lead, job: Job, windowExpiresAt: string | null): Promise<JobResult> {
  if (!isMessagingWindowOpen(windowExpiresAt)) {
    logEvent('api_window_closed', { leadId: lead.id })
    if (lead.channelState !== 'api_window_closed' && lead.channelState !== 'do_not_contact') {
      await LeadModel.update(lead.id, { channelState: 'api_window_closed' })
    }
    return skipped(SKIPPED_API_WINDOW)
  }
  const igsid = parseIgsid(lead.origin, job.payload.senderId)
  if (!igsid) return skipped(SKIPPED_MISSING_IGSID)
  const config = loadBusinessConfig()
  const body = job.payload.body?.trim() || `Aqui é ${config.ownerName} da ${config.companyName}. ${config.verifiedClaims[0] ?? config.oneLinePitch}`
  const sent = await sendOfficialReply({ igsid, text: body })
  const recorded = sent.stub ? `[api-stub] ${body}` : body
  await LeadModel.appendMessage({
    leadId: lead.id,
    body: recorded,
    direction: 'outbound',
    source: 'api',
    jobId: job.id,
    externalId: sent.id,
  })
  await LeadModel.update(lead.id, { lastContactedAt: new Date().toISOString() })
  logEvent('api_reply', { leadId: lead.id, stub: sent.stub })
  return completed()
}

async function advanceForIntent(lead: Lead, intent: string, action: string): Promise<void> {
  let current = lead
  if (intent === 'interested' || intent === 'asked_pricing' || intent === 'asked_info' || action === 'present') {
    if (current.pipelineState === 'replied' && canTransitionPipeline('replied', 'interested')) {
      current = await LeadModel.update(current.id, { pipelineState: 'interested' })
    }
  }
  if (intent === 'wants_whatsapp' || action === 'handoff_whatsapp') {
    if (current.pipelineState === 'replied' && canTransitionPipeline('replied', 'interested')) {
      current = await LeadModel.update(current.id, { pipelineState: 'interested' })
    }
    if (current.pipelineState === 'interested' && canTransitionPipeline('interested', 'whatsapp_handoff')) {
      await LeadModel.update(current.id, { pipelineState: 'whatsapp_handoff' })
    }
  }
}

async function handleInterpretReply(job: Job): Promise<JobResult> {
  const leadId = job.payload.leadId
  if (!leadId) throw new Error('interpret_reply requires leadId')
  const lead = await LeadModel.findById(leadId)
  if (!lead) return skipped(SKIPPED_LEAD_NOT_FOUND)
  if (await DoNotContactModel.has(lead.instagramHandle) || lead.channelState === 'do_not_contact') {
    return skipped(SKIPPED_DO_NOT_CONTACT)
  }

  const allowed = await AiUsageModel.guardBudget()
  if (!allowed) return skipped(SKIPPED_OPENAI_BUDGET)

  const messages = await LeadModel.listMessages(lead.id)
  const inboundText =
    job.payload.body?.trim() ||
    [...messages].reverse().find((message) => message.direction === 'inbound')?.body ||
    ''
  if (!inboundText) return skipped('skipped:no_inbound')

  const decision = await interpretAndDecide({ lead, messages, inboundText })
  await AiUsageModel.record({
    model: decision.model,
    purpose: 'interpret_reply',
    promptTokens: decision.promptTokens,
    completionTokens: decision.completionTokens,
    estimatedCostUsd: decision.estimatedCostUsd,
    leadId: lead.id,
  })
  await LeadModel.update(lead.id, { nextAction: `${decision.intent}:${decision.action}` })

  if (decision.intent === 'opt_out' || decision.action === 'close') {
    await markDoNotContact(lead, 'opt_out', 'interpret_reply')
    await recordCircuitEvent('opt_out')
    logEvent('opt_out_applied', { leadId: lead.id })
    return completed()
  }

  if (decision.action === 'escalate_human' || decision.intent === 'needs_human') {
    await LeadModel.update(lead.id, { channelState: 'human_review_required' })
    return completed()
  }

  await advanceForIntent(lead, decision.intent, decision.action)

  if (!decision.reply) return completed()

  const conversation = await LeadModel.getOrCreateConversation(lead.id)
  if (!apiMaySend(conversation.channelOwner)) {
    logEvent('interpret_no_api_owner', { leadId: lead.id, owner: conversation.channelOwner })
    return skipped(SKIPPED_CHANNEL_LOCK)
  }
  return sendViaOfficialApi(lead, { ...job, payload: { ...job.payload, body: decision.reply } }, conversation.messagingWindowExpiresAt)
}

export async function handleJob(job: Job): Promise<JobResult> {
  switch (job.type) {
    case 'noop':
      return completed()
    case 'record_timeline':
      return handleRecordTimeline(job)
    case 'discover_leads':
      logEvent('discover_leads_stub', { jobId: job.id })
      return completed()
    case 'interpret_reply':
      return handleInterpretReply(job)
    case 'send_first_dm':
      return handleSendFirstDm(job)
    case 'follow_up':
      return handleFollowUp(job)
    default: {
      const unexpected: never = job.type
      throw new Error(`unhandled job type: ${String(unexpected)}`)
    }
  }
}
