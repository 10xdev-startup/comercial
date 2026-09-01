import { messagingWindowExpiresAt } from '@/domain/channelLock'
import { canTransitionPipeline } from '@/domain/pipeline'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { DoNotContactModel } from '@/models/SystemStateModel'
import { recordCircuitEvent } from '@/observability/circuitBreaker'
import { logEvent } from '@/observability/logger'
import type { Lead } from '@/types/crm'
import { parseInboundEvents, type InboundInstagramMessage } from '@/integrations/instagram/webhook'

const IGSID_ORIGIN_PREFIX = 'igsid:'

export function igsidOrigin(senderId: string): string {
  return `${IGSID_ORIGIN_PREFIX}${senderId}`
}

export function parseIgsid(origin: string | null, senderId?: string): string | null {
  if (senderId && senderId.trim()) return senderId.trim()
  if (origin && origin.startsWith(IGSID_ORIGIN_PREFIX)) return origin.slice(IGSID_ORIGIN_PREFIX.length)
  return null
}

export async function processInboundMessages(
  payload: unknown,
  now: Date = new Date(),
): Promise<{ processed: number; duplicates: number; restrictions: number }> {
  const events = parseInboundEvents(payload)
  let processed = 0
  let duplicates = 0
  let restrictions = 0

  for (const event of events) {
    if (event.kind === 'restriction') {
      await recordCircuitEvent('restriction', now.getTime())
      logEvent('instagram_restriction', { senderId: event.senderId, detail: event.detail })
      restrictions += 1
      continue
    }
    const result = await processOneInbound(event, now)
    if (result === 'duplicate') duplicates += 1
    else if (result === 'processed') processed += 1
  }

  return { processed, duplicates, restrictions }
}

async function processOneInbound(
  message: InboundInstagramMessage,
  now: Date,
): Promise<'processed' | 'duplicate' | 'skipped'> {
  const existing = await LeadModel.findMessageByExternalId(message.mid)
  if (existing) {
    logEvent('webhook_duplicate', { mid: message.mid })
    return 'duplicate'
  }

  const lead = await resolveLead(message)
  if (!lead) {
    logEvent('inbound_unmatched', { senderId: message.senderId, username: message.username })
    return 'skipped'
  }

  await LeadModel.appendMessage({
    leadId: lead.id,
    body: message.text,
    direction: 'inbound',
    source: 'api',
    externalId: message.mid,
  })

  const origin = igsidOrigin(message.senderId)
  if (lead.origin !== origin) {
    await LeadModel.update(lead.id, { origin })
  }

  await LeadModel.updateConversation(lead.id, {
    channelOwner: 'api',
    messagingWindowExpiresAt: messagingWindowExpiresAt(now),
  })

  const blocked = lead.channelState === 'do_not_contact' || (await DoNotContactModel.has(lead.instagramHandle))
  if (blocked) {
    if (lead.channelState !== 'do_not_contact') {
      await LeadModel.update(lead.id, { channelState: 'do_not_contact' })
    }
    logEvent('inbound_dnc_recorded', { leadId: lead.id, mid: message.mid })
    return 'processed'
  }

  await moveTowardReplied(lead)
  if (lead.channelState !== 'api_active') {
    await LeadModel.update(lead.id, { channelState: 'api_active' })
  }

  await JobModel.enqueue({
    type: 'interpret_reply',
    payload: {
      leadId: lead.id,
      body: message.text,
      mid: message.mid,
      senderId: message.senderId,
    },
    runAt: now.toISOString(),
    idempotencyKey: `interpret_reply:${message.mid}`,
  })

  logEvent('inbound_handoff', { leadId: lead.id, mid: message.mid })
  return 'processed'
}

async function moveTowardReplied(lead: Lead): Promise<void> {
  let current = lead
  if (current.pipelineState === 'closed') return
  if (current.pipelineState === 'discovered' || current.pipelineState === 'qualified') {
    if (canTransitionPipeline(current.pipelineState, 'contacted')) {
      current = await LeadModel.update(current.id, { pipelineState: 'contacted' })
    }
  }
  if (current.pipelineState === 'contacted' && canTransitionPipeline('contacted', 'replied')) {
    await LeadModel.update(current.id, { pipelineState: 'replied' })
  }
}

async function resolveLead(message: InboundInstagramMessage): Promise<Lead | null> {
  if (message.username) {
    const byHandle = await LeadModel.findByHandle(message.username)
    if (byHandle) return byHandle
  }
  return LeadModel.findByOrigin(igsidOrigin(message.senderId))
}
