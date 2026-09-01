import { describe, it, expect, beforeEach } from '@jest/globals'
import { LeadModel } from '@/models/LeadModel'
import { DoNotContactModel } from '@/models/SystemStateModel'
import { resetMemoryStore } from '@/store/memoryStore'

describe('lead dedupe', () => {
  beforeEach(() => {
    resetMemoryStore()
    delete process.env['SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']
  })

  it('rejects a second lead with the same Instagram handle', async () => {
    await LeadModel.create({ instagramHandle: '@LojaCentro' })
    const existing = await LeadModel.findByHandle('lojacentro')
    expect(existing?.instagramHandle.toLowerCase()).toBe('lojacentro')
    const again = await LeadModel.findByHandle('LojaCentro')
    expect(again?.id).toBe(existing?.id)
  })
})

describe('do not contact', () => {
  beforeEach(() => {
    resetMemoryStore()
  })

  it('blocks re-entry of a handle on the DNC list', async () => {
    await DoNotContactModel.add('loja_centro', 'opt_out', 'operator')
    expect(await DoNotContactModel.has('Loja_Centro')).toBe(true)
  })
})
