import { describe, it, expect, beforeEach } from '@jest/globals'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { SystemStateModel } from '@/models/SystemStateModel'
import { resetMemoryStore } from '@/store/memoryStore'
import { recoverAndTick, tickOnce } from '@/worker/loop'

describe('job worker', () => {
  beforeEach(() => {
    resetMemoryStore()
    delete process.env['SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']
  })

  it('processes a durable record_timeline job against the in-memory store', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'cliente_um', displayName: 'Cliente Um' })
    await JobModel.enqueue({
      type: 'record_timeline',
      payload: { leadId: lead.id, body: 'Nota do operador', source: 'system', direction: 'outbound' },
    })
    const result = await tickOnce()
    expect(result).toBe('ran')
    const messages = await LeadModel.listMessages(lead.id)
    expect(messages).toHaveLength(1)
    expect(messages[0]?.body).toBe('Nota do operador')
    const jobs = await JobModel.list()
    expect(jobs[0]?.status).toBe('succeeded')
  })

  it('does not claim jobs while the system is paused', async () => {
    await SystemStateModel.setPaused(true, 'manual')
    await JobModel.enqueue({ type: 'noop', payload: {} })
    expect(await tickOnce()).toBe('paused')
    const jobs = await JobModel.list()
    expect(jobs[0]?.status).toBe('pending')
  })

  it('recovers a stuck running job after restart', async () => {
    const past = new Date(Date.now() - 10 * 60 * 1000)
    const job = await JobModel.enqueue({ type: 'noop', payload: {}, runAt: past.toISOString() })
    await JobModel.claimNext('old-worker', past)
    const recovered = await JobModel.recoverStuck(5 * 60 * 1000)
    expect(recovered).toBe(1)
    expect((await JobModel.list()).find((row) => row.id === job.id)?.status).toBe('pending')
    expect(await recoverAndTick()).toBe('ran')
  })
})
