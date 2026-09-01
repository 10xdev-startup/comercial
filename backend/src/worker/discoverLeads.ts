import { loadBusinessConfig } from '@/config/business'
import { browserMaySend } from '@/domain/channelLock'
import { buildSimulatedIcpLeads } from '@/domain/simulatedDiscovery'
import { LeadModel } from '@/models/LeadModel'
import { DoNotContactModel } from '@/models/SystemStateModel'
import { logEvent } from '@/observability/logger'
import { enqueueUniqueSend } from '@/worker/sendLock'
import type { Lead } from '@/types/crm'

export interface DiscoverLeadsResult {
  created: number
  skipped: number
  enqueued: number
}

export async function discoverSimulatedLeads(): Promise<DiscoverLeadsResult> {
  const config = loadBusinessConfig()
  const catalog = buildSimulatedIcpLeads(config)
  let created = 0
  let skipped = 0
  let enqueued = 0

  for (const candidate of catalog) {
    if (await DoNotContactModel.has(candidate.instagramHandle)) {
      skipped += 1
      continue
    }
    let lead = await LeadModel.findByHandle(candidate.instagramHandle)
    if (!lead) {
      lead = await LeadModel.create(candidate)
      created += 1
    } else {
      skipped += 1
    }
    if (await maybeEnqueueFirstContact(lead)) enqueued += 1
  }

  logEvent('discover_leads', { created, skipped, enqueued, catalog: catalog.length })
  return { created, skipped, enqueued }
}

async function maybeEnqueueFirstContact(lead: Lead): Promise<boolean> {
  if (lead.channelState !== 'browser_contact_pending') return false
  if (await DoNotContactModel.has(lead.instagramHandle)) return false
  const conversation = await LeadModel.getOrCreateConversation(lead.id)
  if (!browserMaySend(conversation.channelOwner)) return false
  const result = await enqueueUniqueSend({ type: 'send_first_dm', leadId: lead.id })
  return !result.duplicate
}
