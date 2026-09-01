import { describe, it, expect, beforeEach } from '@jest/globals'
import { FakeCdpClient, sendFirstDmOnPage } from '@/integrations/browser/fakeCdp'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { resetMemoryStore } from '@/store/memoryStore'
import { tickOnce } from '@/worker/handlers'
import type { Lead } from '@/types/crm'

const NOW = new Date('2026-09-01T15:00:00.000Z')

function sampleLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-dm',
    instagramHandle: 'loja_teste',
    displayName: 'Loja Teste',
    bio: 'Peças novas',
    funnel: 'customer',
    pipelineState: 'qualified',
    channelState: 'browser_contact_pending',
    score: 77,
    niche: 'moda',
    tags: [],
    origin: 'test',
    roleGuess: 'owner',
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

describe('fake CDP first DM', () => {
  beforeEach(() => {
    resetMemoryStore(false)
  })

  it('types into the simulated composer and clicks Send', async () => {
    const client = new FakeCdpClient()
    await client.connect()
    const page = await client.newPage()
    const result = await sendFirstDmOnPage(page, 'loja_teste', 'Oi, vi a vitrine', { dryRun: false })
    expect(result.sent).toBe(true)
    expect(result.pageUrl).toContain('instagram.com')
    await expect(page.goto('https://example.com')).rejects.toThrow(/restricted/)
    await page.close()
    await client.close()
  })

  it('records the outbound message and waits for reply after a worker tick', async () => {
    await LeadModel.insert(sampleLead())
    await JobModel.enqueue({
      type: 'send_first_dm',
      payload: { leadId: 'lead-dm', text: 'Oi Loja, vi as peças novas' },
      runAt: NOW.toISOString(),
    })
    const outcome = await tickOnce(NOW)
    expect(outcome).toBe('ran')
    const lead = await LeadModel.findById('lead-dm')
    expect(lead?.pipelineState).toBe('contacted')
    expect(lead?.channelState).toBe('waiting_inbound_reply')
    const messages = await LeadModel.listMessages('lead-dm')
    expect(messages.some((row) => row.source === 'browser' && row.direction === 'outbound')).toBe(true)
  })

  it('does not send a second browser DM after channel handoff', async () => {
    await LeadModel.insert(
      sampleLead({ pipelineState: 'replied', channelState: 'api_active' }),
    )
    await JobModel.enqueue({ type: 'send_first_dm', payload: { leadId: 'lead-dm', text: 'segunda' }, runAt: NOW.toISOString() })
    await tickOnce(NOW)
    expect(await LeadModel.listMessages('lead-dm')).toHaveLength(0)
  })
})
