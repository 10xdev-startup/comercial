import { DoNotContactModel, SystemStateModel } from '@/models/SystemStateModel'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { reportError } from '@/services/errorReporting'
import type { Job } from '@/types/job'

const WORKER_ID = `worker-${process.pid}`
const STALE_MS = 5 * 60 * 1000
const PAUSE_RETRY_MS = 15_000

export async function recoverAndTick(now = new Date()): Promise<'idle' | 'ran' | 'paused'> {
  await JobModel.recoverStuck(STALE_MS, now)
  return tickOnce(now)
}

export async function tickOnce(now = new Date()): Promise<'idle' | 'ran' | 'paused'> {
  const system = await SystemStateModel.get()
  if (system.paused) return 'paused'

  const job = await JobModel.claimNext(WORKER_ID, now)
  if (!job) return 'idle'
  try {
    await handleJob(job)
    await JobModel.finish(job.id, 'succeeded')
    return 'ran'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    void reportError({ context: `worker:${job.type}`, error: err })
    if (job.attempts >= job.maxAttempts) {
      await JobModel.finish(job.id, 'dead_letter', message)
    } else {
      await JobModel.finish(job.id, 'failed', message)
    }
    return 'ran'
  }
}

async function handleJob(job: Job): Promise<void> {
  if (job.type === 'noop') return
  if (job.type === 'record_timeline') {
    await handleRecordTimeline(job)
    return
  }
}

async function handleRecordTimeline(job: Job): Promise<void> {
  const leadId = job.payload.leadId
  const body = job.payload.body
  if (!leadId || !body) throw new Error('record_timeline requires leadId and body')
  const lead = await LeadModel.findById(leadId)
  if (!lead) throw new Error(`Lead not found: ${leadId}`)
  if (await DoNotContactModel.has(lead.instagramHandle)) {
    await LeadModel.update(lead.id, { channelState: 'do_not_contact', pipelineState: 'closed' })
    return
  }
  await LeadModel.appendMessage({
    leadId: lead.id,
    body,
    direction: job.payload.direction ?? 'outbound',
    source: job.payload.source ?? 'system',
    jobId: job.id,
  })
}

let timer: NodeJS.Timeout | null = null

export function startWorkerLoop(): void {
  if (timer) return
  const pollMs = Number(process.env['WORKER_POLL_MS'] ?? 2000)
  const interval = Number.isFinite(pollMs) && pollMs > 200 ? pollMs : 2000
  const tick = (): void => {
    void recoverAndTick().then((result) => {
      if (result === 'paused' && interval < PAUSE_RETRY_MS) return
    }).catch((err: unknown) => {
      void reportError({ context: 'worker:loop', error: err })
    })
  }
  tick()
  timer = setInterval(tick, interval)
  timer.unref()
}

export function stopWorkerLoop(): void {
  if (!timer) return
  clearInterval(timer)
  timer = null
}
