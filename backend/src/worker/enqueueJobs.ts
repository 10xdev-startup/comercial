import { JobModel } from '@/models/JobModel'
import type { Job } from '@/types/job'
import { enqueueUniqueSend, sendLockKey } from '@/worker/sendLock'

export async function enqueueDiscoverLeads(): Promise<{ job: Job; duplicate: boolean }> {
  const existing = (await JobModel.list()).find(
    (job) => job.type === 'discover_leads' && (job.status === 'pending' || job.status === 'running'),
  )
  if (existing) return { job: existing, duplicate: true }
  const job = await JobModel.enqueue({ type: 'discover_leads', payload: {} })
  return { job, duplicate: false }
}

export { enqueueUniqueSend, sendLockKey }
