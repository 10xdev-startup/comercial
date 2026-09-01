import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { readFileSync } from 'fs'
import path from 'path'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { DoNotContactModel, SystemStateModel } from '@/models/SystemStateModel'
import { resetMemoryStore } from '@/store/memoryStore'
import { SKIPPED_DO_NOT_CONTACT } from '@/types/job'
import { resetComposerOverride, setComposerOverride } from '@/browser/composer'
import { FakeInstagramComposer } from '@/browser/fakeCdp'
import { resetCircuitBreaker } from '@/observability/circuitBreaker'
import { resetBrowserMutex } from '@/worker/browserMutex'
import { recoverAndTick, tickOnce } from '@/worker/loop'
import { enqueueUniqueSend } from '@/worker/sendLock'

function openHoursUtc(): void {
  process.env['OPERATING_HOURS'] = '00:00-24:00'
  process.env['OPERATING_TIMEZONE'] = 'UTC'
  process.env['MAX_DMS_PER_DAY'] = '30'
  process.env['MIN_SECONDS_BETWEEN_DMS'] = '0'
  process.env['MAX_SECONDS_BETWEEN_DMS'] = '0'
}

describe('job worker', () => {
  beforeEach(() => {
    resetMemoryStore()
    resetComposerOverride()
    resetCircuitBreaker()
    resetBrowserMutex()
    delete process.env['SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']
    delete process.env['INSTAGRAM_LIVE_SEND']
    delete process.env['CHROME_CDP_URL']
    delete process.env['OPENAI_API_KEY']
    process.env['OPENAI_MONTHLY_BUDGET_USD'] = '50'
    process.env['WORKER_RETRY_BACKOFF_MS'] = '0'
    openHoursUtc()
  })

  it('claims the next due job and increments attempts', async () => {
    const job = await JobModel.enqueue({ type: 'noop', payload: {} })
    const claimed = await JobModel.claimNext('worker-a')
    expect(claimed?.id).toBe(job.id)
    expect(claimed?.status).toBe('running')
    expect(claimed?.attempts).toBe(1)
    expect(claimed?.lockedBy).toBe('worker-a')
    expect(await JobModel.claimNext('worker-b')).toBeNull()
  })

  it('retries a failed job until the limit then dead-letters it', async () => {
    const job = await JobModel.enqueue({
      type: 'record_timeline',
      payload: {},
      maxAttempts: 2,
    })
    expect(await tickOnce()).toBe('ran')
    const afterFirst = (await JobModel.list()).find((row) => row.id === job.id)
    expect(afterFirst?.status).toBe('pending')
    expect(afterFirst?.attempts).toBe(1)
    expect(afterFirst?.lastError).toMatch(/leadId and body/)

    expect(await tickOnce()).toBe('ran')
    const afterSecond = (await JobModel.list()).find((row) => row.id === job.id)
    expect(afterSecond?.status).toBe('dead_letter')
    expect(afterSecond?.attempts).toBe(2)
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

  it('does not claim send_first_dm while the system is paused', async () => {
    await SystemStateModel.setPaused(true, 'manual')
    const lead = await LeadModel.create({ instagramHandle: 'pausado' })
    await enqueueUniqueSend({ type: 'send_first_dm', leadId: lead.id })
    expect(await tickOnce()).toBe('paused')
    const jobs = await JobModel.list()
    expect(jobs[0]?.status).toBe('pending')
    expect(jobs[0]?.attempts).toBe(0)
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

  it('returns the same job for a duplicate send lock', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'lock_me' })
    const first = await enqueueUniqueSend({ type: 'send_first_dm', leadId: lead.id })
    const second = await enqueueUniqueSend({ type: 'send_first_dm', leadId: lead.id })
    expect(second.duplicate).toBe(true)
    expect(second.job.id).toBe(first.job.id)
    expect(first.duplicate).toBe(false)
  })

  it('completes discover_leads without sending', async () => {
    await JobModel.enqueue({ type: 'discover_leads', payload: {} })
    expect(await tickOnce()).toBe('ran')
    const jobs = await JobModel.list()
    expect(jobs.every((job) => job.status === 'succeeded')).toBe(true)
  })

  it('sends first contact through the fake CDP composer in dry-run', async () => {
    const fake = new FakeInstagramComposer()
    setComposerOverride(fake)
    const lead = await LeadModel.create({ instagramHandle: 'stub_send' })
    const fetchSpy = jest.spyOn(globalThis, 'fetch')
    const now = new Date('2026-09-01T12:00:00.000Z')
    await enqueueUniqueSend({
      type: 'send_first_dm',
      leadId: lead.id,
      runAt: now.toISOString(),
      body: 'Oi, dry-run de primeiro contato',
    })
    expect(await tickOnce(now)).toBe('ran')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
    expect(fake.actions).toEqual([
      'openProfile:stub_send',
      'openComposer',
      'typeMessage',
      'send',
      'dispose',
    ])
    expect(fake.page.sendClicks).toBe(0)
    const jobs = await JobModel.list()
    expect(jobs[0]?.status).toBe('succeeded')
    expect(jobs[0]?.lastError).toBeNull()
    const updated = await LeadModel.findById(lead.id)
    expect(updated?.channelState).toBe('waiting_inbound_reply')
    expect(updated?.pipelineState).toBe('contacted')
    const conversation = await LeadModel.getOrCreateConversation(lead.id)
    expect(conversation.channelOwner).toBe('browser')
    const messages = await LeadModel.listMessages(lead.id)
    expect(messages).toHaveLength(1)
    expect(messages[0]?.source).toBe('browser')
    expect(messages[0]?.body).toBe('[dry-run] Oi, dry-run de primeiro contato')
  })

  it('skips a send when the handle is do-not-contact and does not consume a dm slot', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'nao_mexer' })
    await DoNotContactModel.add('nao_mexer', 'opt-out', 'test')
    const now = new Date('2026-09-01T12:00:00.000Z')
    await enqueueUniqueSend({ type: 'send_first_dm', leadId: lead.id, runAt: now.toISOString() })
    expect(await tickOnce(now)).toBe('ran')
    const jobs = await JobModel.list()
    expect(jobs[0]?.status).toBe('succeeded')
    expect(jobs[0]?.lastError).toBe(SKIPPED_DO_NOT_CONTACT)
    expect(await JobModel.countSucceededDmJobsSince('2026-09-01T00:00:00.000Z')).toBe(0)
  })

  it('defers send jobs outside operating hours without burning attempts', async () => {
    process.env['OPERATING_HOURS'] = '09:00-20:00'
    process.env['OPERATING_TIMEZONE'] = 'America/Sao_Paulo'
    const lead = await LeadModel.create({ instagramHandle: 'fora_hora' })
    const now = new Date('2026-09-01T23:30:00.000Z')
    await enqueueUniqueSend({ type: 'send_first_dm', leadId: lead.id, runAt: now.toISOString() })
    expect(await tickOnce(now)).toBe('deferred')
    const job = (await JobModel.list())[0]
    expect(job?.status).toBe('pending')
    expect(job?.attempts).toBe(0)
    expect(job?.lastError).toBe('deferred:operating_hours')
    expect(job?.runAt).toBe('2026-09-02T12:00:00.000Z')
  })

  it('defers a second dm until MIN_SECONDS_BETWEEN_DMS has elapsed', async () => {
    process.env['MIN_SECONDS_BETWEEN_DMS'] = '90'
    process.env['MAX_SECONDS_BETWEEN_DMS'] = '90'
    const firstLead = await LeadModel.create({ instagramHandle: 'intervalo_a' })
    const secondLead = await LeadModel.create({ instagramHandle: 'intervalo_b' })
    const now = new Date('2026-09-01T12:00:00.000Z')
    await enqueueUniqueSend({ type: 'send_first_dm', leadId: firstLead.id, runAt: now.toISOString() })
    expect(await tickOnce(now)).toBe('ran')
    await enqueueUniqueSend({ type: 'send_first_dm', leadId: secondLead.id, runAt: now.toISOString() })
    expect(await tickOnce(now)).toBe('deferred')
    const pending = (await JobModel.list()).find((job) => job.status === 'pending')
    expect(pending?.lastError).toBe('deferred:min_interval')
    expect(pending?.runAt).toBe(new Date(now.getTime() + 90_000).toISOString())
    expect(pending?.attempts).toBe(0)
  })

  it('defers sends after MAX_DMS_PER_DAY to the next operating start', async () => {
    process.env['MAX_DMS_PER_DAY'] = '2'
    const now = new Date('2026-09-01T12:00:00.000Z')
    const leads = [
      await LeadModel.create({ instagramHandle: 'cap_a' }),
      await LeadModel.create({ instagramHandle: 'cap_b' }),
      await LeadModel.create({ instagramHandle: 'cap_c' }),
    ]
    for (const lead of leads) {
      await enqueueUniqueSend({ type: 'send_first_dm', leadId: lead.id, runAt: now.toISOString() })
    }
    expect(await tickOnce(now)).toBe('ran')
    expect(await tickOnce(now)).toBe('ran')
    expect(await tickOnce(now)).toBe('deferred')
    const pending = (await JobModel.list()).find((job) => job.status === 'pending')
    expect(pending?.lastError).toBe('deferred:daily_cap')
    expect(pending?.runAt).toBe('2026-09-02T00:00:00.000Z')
  })

  it('does not import private Instagram APIs or fingerprint spoofing in the worker', () => {
    const files = ['loop.ts', 'handlers.ts', 'sendLock.ts', 'schedule.ts']
    for (const file of files) {
      const src = readFileSync(path.resolve(__dirname, '../worker', file), 'utf8')
      expect(src.toLowerCase()).not.toMatch(/graph\.facebook|fingerprint|stealth plugin|private.?api|user-agent.?spoof/)
    }
  })
})
