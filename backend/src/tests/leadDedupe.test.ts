import { describe, it, expect, beforeEach } from '@jest/globals'
import { LeadModel } from '@/models/LeadModel'
import { resetMemoryStore } from '@/store/memoryStore'
import type { Lead } from '@/types/crm'

function sampleLead(overrides: Partial<Lead> = {}): Lead {
  const now = '2026-09-01T15:00:00.000Z'
  return {
    id: 'lead-new',
    instagramHandle: 'nova_loja',
    displayName: 'Nova Loja',
    bio: 'Atacado',
    funnel: 'customer',
    pipelineState: 'qualified',
    channelState: 'browser_contact_pending',
    score: 80,
    niche: 'moda',
    tags: [],
    origin: 'test',
    roleGuess: 'owner',
    nextAction: 'send_first_dm',
    nextActionAt: now,
    campaignId: null,
    experimentId: null,
    experimentVariant: null,
    metaIgsid: null,
    lastContactedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('lead dedupe', () => {
  beforeEach(() => {
    resetMemoryStore(false)
  })

  it('rejects a second insert of the same handle', async () => {
    await LeadModel.insert(sampleLead())
    await expect(LeadModel.insert(sampleLead({ id: 'lead-dup' }))).rejects.toThrow(/Duplicate lead/)
  })

  it('treats handles as case-insensitive and ignores @', async () => {
    await LeadModel.insert(sampleLead({ instagramHandle: 'Nova_Loja' }))
    const found = await LeadModel.findByHandle('@nova_loja')
    expect(found?.id).toBe('lead-new')
  })
})
