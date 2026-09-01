import { describe, it, expect, beforeEach } from '@jest/globals'
import type { Request, Response } from 'express'
import { loadBusinessConfig, resetBusinessConfigCache } from '@/config/business'
import { CrmController } from '@/controllers/CrmController'
import { seedDemoClientLeadsIfEmpty } from '@/domain/demoSeed'
import { SIMULATED_ICP_ORIGIN, buildDemoClientLeads } from '@/domain/simulatedDiscovery'
import { LeadModel } from '@/models/LeadModel'
import { resetMemoryStore } from '@/store/memoryStore'
import { resetCircuitBreaker } from '@/observability/circuitBreaker'

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = ((code: number) => {
    ;(res as Response & { statusCode: number }).statusCode = code
    return res as Response
  }) as Response['status']
  res.json = ((payload: unknown) => {
    ;(res as Response & { body: unknown }).body = payload
    return res as Response
  }) as Response['json']
  return res as Response
}

describe('demo client seed', () => {
  beforeEach(() => {
    resetMemoryStore()
    resetCircuitBreaker()
    resetBusinessConfigCache()
    delete process.env['SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']
  })

  it('inserts agency and business-owner demo leads when the board is empty', async () => {
    const config = loadBusinessConfig()
    const catalog = buildDemoClientLeads(config)
    expect(catalog.length).toBe(2)
    expect(catalog.some((lead) => (lead.niche ?? '').includes('agência') || (lead.niche ?? '').includes('agencia'))).toBe(true)
    expect(catalog.some((lead) => (lead.niche ?? '').includes('dono'))).toBe(true)
    expect(JSON.stringify(catalog).toLowerCase()).not.toMatch(/affiliate|afiliad/)

    const first = await seedDemoClientLeadsIfEmpty()
    expect(first.seeded).toBe(true)
    expect(first.created).toBe(2)
    const leads = await LeadModel.list()
    expect(leads).toHaveLength(2)
    expect(leads.every((lead) => lead.origin === SIMULATED_ICP_ORIGIN)).toBe(true)
    expect(leads.every((lead) => lead.instagramHandle.startsWith('sim_'))).toBe(true)
  })

  it('is idempotent: a second seed does not duplicate', async () => {
    await seedDemoClientLeadsIfEmpty()
    const second = await seedDemoClientLeadsIfEmpty()
    expect(second.seeded).toBe(false)
    expect(second.created).toBe(0)
    expect(await LeadModel.list()).toHaveLength(2)
  })

  it('does not seed when the board already has a lead', async () => {
    await LeadModel.create({ instagramHandle: 'loja_manual' })
    const result = await seedDemoClientLeadsIfEmpty()
    expect(result.seeded).toBe(false)
    expect(result.created).toBe(0)
    expect(await LeadModel.list()).toHaveLength(1)
  })

  it('seeds on the first CRM board load', async () => {
    const res = mockRes()
    await CrmController.board({} as Request, res)
    const body = (res as Response & {
      body: { success: boolean; data: { metrics: { leadCount: number } } }
    }).body
    expect(body.data.metrics.leadCount).toBe(2)
    const again = mockRes()
    await CrmController.board({} as Request, again)
    const second = (again as Response & {
      body: { success: boolean; data: { metrics: { leadCount: number } } }
    }).body
    expect(second.data.metrics.leadCount).toBe(2)
  })
})
