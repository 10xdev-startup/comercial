import { describe, it, expect, beforeEach } from '@jest/globals'
import { DoNotContactModel } from '@/models/DoNotContactModel'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { resetMemoryStore } from '@/store/memoryStore'
import { tickOnce } from '@/worker/handlers'
import type { Lead } from '@/types/crm'

const NOW = new Date('2026-09-01T15:00:00.000Z')

function sampleLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-dnc',
    instagramHandle: 'parar_agora',
    displayName: 'Stop',
    bio: null,
    funnel: 'customer',
    pipelineState: 'qualified',
    channelState: 'browser_contact_pending',
    score: 10,
    niche: null,
    tags: [],
    origin: 'test',
    roleGuess: 'unknown',
    nextAction: 'send_first_dm',
    nextActionAt: NOW.toISOString(),
    campaignId: null,
    experimentId: null,
    experimentVariant: null,
    metaIgsid: null,
    lastContactedAt: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  }
}

describe('do not contact', () => {
  beforeEach(() => {
    resetMemoryStore(false)
  })

  it('skips first DM and closes the lead when the handle is on the list', async () => {
    await LeadModel.insert(sampleLead())
    await DoNotContactModel.add('parar_agora', 'opt_out', 'test')
    await JobModel.enqueue({ type: 'send_first_dm', payload: { leadId: 'lead-dnc', text: 'oi' }, runAt: NOW.toISOString() })
    await tickOnce(NOW)
    const lead = await LeadModel.findById('lead-dnc')
    expect(lead?.channelState).toBe('do_not_contact')
    expect(lead?.pipelineState).toBe('closed')
    expect(await LeadModel.listMessages('lead-dnc')).toHaveLength(0)
  })
})
