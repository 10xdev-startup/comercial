import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { loadBusinessConfig, resetBusinessConfigCache } from '@/config/business'
import { buildSimulatedIcpLeads, SIMULATED_ICP_ORIGIN } from '@/domain/simulatedDiscovery'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { DoNotContactModel, SystemStateModel } from '@/models/SystemStateModel'
import { resetMemoryStore } from '@/store/memoryStore'
import { AppError } from '@/utils/AppError'
import { CrmController } from '@/controllers/CrmController'
import { resetCircuitBreaker } from '@/observability/circuitBreaker'
import { resetBrowserMutex } from '@/worker/browserMutex'
import { tickOnce } from '@/worker/loop'
import { enqueueDiscoverLeads } from '@/worker/enqueueJobs'
import { resetComposerOverride } from '@/browser/composer'
import type { Request, Response } from 'express'

function openHoursUtc(): void {
  process.env['OPERATING_HOURS'] = '00:00-24:00'
  process.env['OPERATING_TIMEZONE'] = 'UTC'
  process.env['MAX_DMS_PER_DAY'] = '30'
  process.env['MIN_SECONDS_BETWEEN_DMS'] = '0'
  process.env['MAX_SECONDS_BETWEEN_DMS'] = '0'
}

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

describe('simulated lead discovery', () => {
  beforeEach(() => {
    resetMemoryStore()
    resetCircuitBreaker()
    resetBrowserMutex()
    resetComposerOverride()
    resetBusinessConfigCache()
    delete process.env['SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']
    delete process.env['INSTAGRAM_LIVE_SEND']
    delete process.env['CHROME_CDP_URL']
    delete process.env['OPENAI_API_KEY']
    process.env['WORKER_RETRY_BACKOFF_MS'] = '0'
    openHoursUtc()
  })

  it('builds one simulated client lead per ICP segment without live handles', () => {
    const config = loadBusinessConfig()
    const catalog = buildSimulatedIcpLeads(config)
    expect(catalog.length).toBe(config.icpSegments.length)
    expect(catalog.every((lead) => lead.origin === SIMULATED_ICP_ORIGIN)).toBe(true)
    expect(catalog.every((lead) => lead.instagramHandle.startsWith('sim_'))).toBe(true)
    const own = config.instagramHandle.replace(/^@/, '').toLowerCase()
    expect(catalog.some((lead) => lead.instagramHandle.toLowerCase() === own)).toBe(false)
    expect(JSON.stringify(catalog).toLowerCase()).not.toMatch(/affiliate|afiliad/)
  })

  it('creates leads from ICP, skips duplicates and DNC, and enqueues first contact only', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch')
    const now = new Date('2026-09-01T12:00:00.000Z')
    await JobModel.enqueue({ type: 'discover_leads', payload: {}, runAt: now.toISOString() })
    expect(await tickOnce(now)).toBe('ran')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()

    const leads = await LeadModel.list()
    expect(leads.length).toBeGreaterThan(0)
    expect(leads.every((lead) => lead.origin === SIMULATED_ICP_ORIGIN)).toBe(true)
    expect(leads.every((lead) => lead.pipelineState === 'discovered')).toBe(true)
    const sendJobs = (await JobModel.list()).filter((job) => job.type === 'send_first_dm')
    expect(sendJobs).toHaveLength(leads.length)
    expect(sendJobs.every((job) => job.status === 'pending')).toBe(true)
    expect((await JobModel.list()).some((job) => job.type === 'follow_up')).toBe(false)

    const before = leads.length
    await DoNotContactModel.add(leads[0]!.instagramHandle, 'opt_out', 'test')
    await JobModel.enqueue({ type: 'discover_leads', payload: {}, runAt: now.toISOString() })
    expect(await tickOnce(now)).toBe('ran')
    expect(await LeadModel.list()).toHaveLength(before)
  })

  it('reuses a pending discover job instead of duplicating the queue', async () => {
    const first = await enqueueDiscoverLeads()
    const second = await enqueueDiscoverLeads()
    expect(second.duplicate).toBe(true)
    expect(second.job.id).toBe(first.job.id)
    expect((await JobModel.list()).filter((job) => job.type === 'discover_leads')).toHaveLength(1)
  })

  it('rejects first-contact enqueue while the system is paused', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'pausado_ui' })
    await SystemStateModel.setPaused(true, 'manual')
    const req = { params: { id: lead.id }, body: {} } as unknown as Request
    await expect(CrmController.enqueueFirstContact(req, mockRes())).rejects.toMatchObject({
      name: 'AppError',
      code: 'SYSTEM_PAUSED',
    } satisfies Partial<AppError>)
  })
})
