import { describe, it, expect, beforeEach } from '@jest/globals'
import { EarlyWinnerError, ExperimentModel } from '@/models/ExperimentModel'
import { LeadModel } from '@/models/LeadModel'
import { resetMemoryStore } from '@/store/memoryStore'
import { resetCircuitBreaker } from '@/observability/circuitBreaker'
import { enqueueUniqueSend } from '@/worker/sendLock'
import { tickOnce } from '@/worker/loop'
import { resetComposerOverride, setComposerOverride } from '@/browser/composer'
import { FakeInstagramComposer } from '@/browser/fakeCdp'
import { resetBrowserMutex } from '@/worker/browserMutex'

describe('experiments', () => {
  beforeEach(() => {
    resetMemoryStore()
    resetCircuitBreaker()
    resetBrowserMutex()
    resetComposerOverride()
    delete process.env['SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']
    process.env['OPERATING_HOURS'] = '00:00-24:00'
    process.env['OPERATING_TIMEZONE'] = 'UTC'
    process.env['MAX_DMS_PER_DAY'] = '30'
    process.env['MIN_SECONDS_BETWEEN_DMS'] = '0'
    process.env['MAX_SECONDS_BETWEEN_DMS'] = '0'
    process.env['WORKER_RETRY_BACKOFF_MS'] = '0'
  })

  it('allows exactly one variant plus control', async () => {
    await expect(
      ExperimentModel.create({
        name: 'abertura',
        hypothesis: 'tom curto converte melhor',
        variants: ['short', 'long'],
        sampleSize: 40,
      }),
    ).rejects.toThrow(/exactly one variable/)
    const created = await ExperimentModel.create({
      name: 'abertura',
      hypothesis: 'tom curto converte melhor',
      variants: ['short'],
      sampleSize: 40,
    })
    expect(created.variants).toEqual(['short'])
    expect(created.controlVariant).toBe('control')
  })

  it('refuses to declare a winner before sample size', async () => {
    const experiment = await ExperimentModel.create({
      name: 'cta',
      hypothesis: 'whatsapp no primeiro reply',
      variants: ['wa-first'],
      sampleSize: 20,
    })
    await expect(ExperimentModel.declareWinner(experiment.id, 'wa-first', 3)).rejects.toBeInstanceOf(EarlyWinnerError)
  })

  it('attributes a running experiment on first contact', async () => {
    setComposerOverride(new FakeInstagramComposer())
    const experiment = await ExperimentModel.create({
      name: 'copy',
      hypothesis: 'pitch curto',
      variants: ['short'],
      sampleSize: 10,
    })
    const lead = await LeadModel.create({ instagramHandle: 'exp_lead' })
    const now = new Date('2026-09-01T12:00:00.000Z')
    await enqueueUniqueSend({ type: 'send_first_dm', leadId: lead.id, runAt: now.toISOString(), body: 'Oi' })
    expect(await tickOnce(now)).toBe('ran')
    const updated = await LeadModel.findById(lead.id)
    expect(updated?.experimentId).toBe(experiment.id)
    expect(['control', 'short']).toContain(updated?.experimentVariant)
    expect(await LeadModel.countByExperiment(experiment.id)).toBe(1)
  })
})
