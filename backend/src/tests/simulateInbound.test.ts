import { describe, it, expect, beforeEach } from '@jest/globals'
import type { Request, Response } from 'express'
import { CrmController } from '@/controllers/CrmController'
import { SKIPPED_CHANNEL_LOCK } from '@/domain/channelLock'
import { simulateInboundForLead } from '@/integrations/instagram/simulateInbound'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { DoNotContactModel, SystemStateModel } from '@/models/SystemStateModel'
import { resetCircuitBreaker } from '@/observability/circuitBreaker'
import { resetMemoryStore } from '@/store/memoryStore'
import { AppError } from '@/utils/AppError'
import { resetComposerOverride, setComposerOverride } from '@/browser/composer'
import { FakeInstagramComposer } from '@/browser/fakeCdp'
import { resetBrowserMutex } from '@/worker/browserMutex'
import { tickOnce } from '@/worker/loop'
import { enqueueUniqueSend } from '@/worker/sendLock'

function openHoursUtc(): void {
  process.env['OPERATING_HOURS'] = '00:00-24:00'
  process.env['OPERATING_TIMEZONE'] = 'UTC'
  process.env['MAX_DMS_PER_DAY'] = '30'
  process.env['MIN_SECONDS_BETWEEN_DMS'] = '0'
  process.env['MAX_SECONDS_BETWEEN_DMS'] = '0'
  process.env['WORKER_RETRY_BACKOFF_MS'] = '0'
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

function reqFor(leadId: string, body: Record<string, unknown> = {}): Request {
  return { params: { id: leadId }, body } as unknown as Request
}

describe('inbound webhook simulator', () => {
  beforeEach(() => {
    resetMemoryStore()
    resetCircuitBreaker()
    resetBrowserMutex()
    resetComposerOverride()
    delete process.env['SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']
    delete process.env['OPENAI_API_KEY']
    delete process.env['INSTAGRAM_PAGE_ACCESS_TOKEN']
    delete process.env['INSTAGRAM_LIVE_SEND']
    delete process.env['CHROME_CDP_URL']
    process.env['OPENAI_MONTHLY_BUDGET_USD'] = '50'
    openHoursUtc()
  })

  it('rejects an unknown scenario', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'sim_bad' })
    await expect(CrmController.simulateInbound(reqFor(lead.id, { scenario: 'hello' }), mockRes())).rejects.toMatchObject({
      name: 'AppError',
      code: 'INVALID_SCENARIO',
    } satisfies Partial<AppError>)
  })

  it('locks the browser after a simulated question and skips send_first_dm', async () => {
    const fake = new FakeInstagramComposer()
    setComposerOverride(fake)
    const lead = await LeadModel.create({ instagramHandle: 'sim_lock' })
    const now = new Date('2026-09-01T12:00:00.000Z')
    const simulated = await simulateInboundForLead(lead, 'question', now)
    expect(simulated.processed).toBe(1)
    expect(simulated.mid.startsWith('sim:')).toBe(true)

    const interpret = (await JobModel.list()).find((job) => job.type === 'interpret_reply')
    expect(interpret?.idempotencyKey).toBe(`interpret_reply:${simulated.mid}`)
    const conversation = await LeadModel.getOrCreateConversation(lead.id)
    expect(conversation.channelOwner).toBe('api')

    const res = mockRes()
    await CrmController.simulateInbound(reqFor(lead.id, { scenario: 'question' }), res)
    expect((res as Response & { statusCode: number }).statusCode).toBe(200)

    await expect(CrmController.enqueueFirstContact(reqFor(lead.id), mockRes())).rejects.toMatchObject({
      name: 'AppError',
      code: 'CHANNEL_LOCK',
    } satisfies Partial<AppError>)

    await JobModel.enqueue({
      type: 'send_first_dm',
      payload: { leadId: lead.id, body: 'nao deveria ir' },
      runAt: now.toISOString(),
      idempotencyKey: 'send_first_dm:sim_lock:forced',
    })
    for (let i = 0; i < 4; i += 1) {
      const outcome = await tickOnce(now)
      if (outcome === 'idle') break
    }
    const skipped = (await JobModel.list()).find((job) => job.idempotencyKey === 'send_first_dm:sim_lock:forced')
    expect(skipped?.status).toBe('succeeded')
    expect(skipped?.lastError).toBe(SKIPPED_CHANNEL_LOCK)
    expect(fake.actions.filter((action) => action === 'openComposer')).toHaveLength(0)
  })

  it('applies DNC after a simulated opt-out is interpreted', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'sim_dnc' })
    const now = new Date('2026-09-01T12:00:00.000Z')
    const simulated = await simulateInboundForLead(lead, 'opt_out', now)
    expect(simulated.processed).toBe(1)
    expect(await tickOnce(now)).toBe('ran')
    expect(await DoNotContactModel.has('sim_dnc')).toBe(true)
    const updated = await LeadModel.findById(lead.id)
    expect(updated?.channelState).toBe('do_not_contact')
    const outbound = (await LeadModel.listMessages(lead.id)).filter((message) => message.direction === 'outbound')
    expect(outbound).toHaveLength(0)
    await expect(CrmController.enqueueFirstContact(reqFor(lead.id), mockRes())).rejects.toMatchObject({
      name: 'AppError',
      code: 'DO_NOT_CONTACT',
    } satisfies Partial<AppError>)
  })

  it('hands off WhatsApp after a simulated opt-in with the OpenAI mock', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'sim_zap' })
    const now = new Date('2026-09-01T12:00:00.000Z')
    await simulateInboundForLead(lead, 'opt_in', now)
    expect(await tickOnce(now)).toBe('ran')
    const updated = await LeadModel.findById(lead.id)
    expect(updated?.pipelineState).toBe('whatsapp_handoff')
    const messages = await LeadModel.listMessages(lead.id)
    expect(messages.some((message) => message.body.includes('wa.me/'))).toBe(true)
  })

  it('pauses on a simulated restriction without matching a lead', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'sim_block' })
    const result = await simulateInboundForLead(lead, 'restriction')
    expect(result.restrictions).toBe(1)
    const state = await SystemStateModel.get()
    expect(state.paused).toBe(true)
    expect(state.pauseReason).toBe('instagram_restriction')
    await expect(CrmController.enqueueFirstContact(reqFor(lead.id), mockRes())).rejects.toMatchObject({
      code: 'SYSTEM_PAUSED',
    })
  })

  it('does not use live send when simulating inbound', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'sim_dry' })
    await enqueueUniqueSend({
      type: 'send_first_dm',
      leadId: lead.id,
      runAt: new Date('2026-09-01T12:00:00.000Z').toISOString(),
      body: 'Oi',
    })
    await simulateInboundForLead(lead, 'question', new Date('2026-09-01T12:00:00.000Z'))
    expect(process.env['INSTAGRAM_LIVE_SEND']).toBeUndefined()
  })
})
