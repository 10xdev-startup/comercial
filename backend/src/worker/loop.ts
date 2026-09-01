import { loadRateLimits } from '@/config/rateLimits'
import { JobModel } from '@/models/JobModel'
import { SystemStateModel } from '@/models/SystemStateModel'
import { reportError } from '@/services/errorReporting'
import { isSendJobType, SKIPPED_DO_NOT_CONTACT, type Job } from '@/types/job'
import { handleJob } from '@/worker/handlers'
import { nextAllowedSendAt, startOfZonedDay } from '@/worker/schedule'

const WORKER_ID = `worker-${process.pid}`
const STALE_MS = 5 * 60 * 1000
const PAUSE_RETRY_MS = 15_000

export type TickResult = 'idle' | 'ran' | 'paused' | 'deferred'

function retryBackoffMs(attempts: number): number {
  const fromEnv = Number(process.env['WORKER_RETRY_BACKOFF_MS'])
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv
  const exp = Math.min(60 * 60 * 1000, 1000 * 2 ** Math.max(0, attempts - 1))
  return exp
}

async function deferSendIfLimited(job: Job, now: Date): Promise<{ at: Date; reason: string } | null> {
  if (!isSendJobType(job.type)) return null
  const config = loadRateLimits()
  const since = startOfZonedDay(now, config.timeZone).toISOString()
  const dmsToday = await JobModel.countSucceededDmJobsSince(since)
  const lastFinishedAt = await JobModel.latestSucceededDmFinishedAt()
  const decision = nextAllowedSendAt({
    now,
    lastSendAt: lastFinishedAt ? new Date(lastFinishedAt) : null,
    dmsToday,
    config,
  })
  if (decision.reason === 'ok') return null
  return { at: decision.at, reason: `deferred:${decision.reason}` }
}

export async function recoverAndTick(now = new Date()): Promise<TickResult> {
  await JobModel.recoverStuck(STALE_MS, now)
  return tickOnce(now)
}

export async function tickOnce(now = new Date()): Promise<TickResult> {
  const system = await SystemStateModel.get()
  if (system.paused) return 'paused'

  const job = await JobModel.claimNext(WORKER_ID, now)
  if (!job) return 'idle'

  const deferred = await deferSendIfLimited(job, now)
  if (deferred) {
    await JobModel.defer(job.id, deferred.at.toISOString(), deferred.reason)
    return 'deferred'
  }

  try {
    const outcome = await handleJob(job)
    if (outcome === 'skipped') {
      await JobModel.finish(job.id, 'succeeded', { lastError: SKIPPED_DO_NOT_CONTACT, at: now })
    } else {
      await JobModel.finish(job.id, 'succeeded', { at: now })
    }
    return 'ran'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    void reportError({ context: `worker:${job.type}`, error: err })
    if (job.attempts >= job.maxAttempts) {
      await JobModel.finish(job.id, 'dead_letter', { lastError: message, at: now })
    } else {
      const retryAt = new Date(now.getTime() + retryBackoffMs(job.attempts))
      await JobModel.reschedule(job.id, retryAt.toISOString(), message)
    }
    return 'ran'
  }
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
