export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'dead_letter'

export const SEND_JOB_TYPES = ['send_first_dm', 'follow_up'] as const
export type SendJobType = (typeof SEND_JOB_TYPES)[number]

export type JobType =
  | 'record_timeline'
  | 'noop'
  | 'discover_leads'
  | 'send_first_dm'
  | 'follow_up'
  | 'interpret_reply'

export function isSendJobType(type: JobType): type is SendJobType {
  return type === 'send_first_dm' || type === 'follow_up'
}

export interface JobPayload {
  leadId?: string
  body?: string
  source?: 'browser' | 'api' | 'system'
  direction?: 'inbound' | 'outbound'
  followUpKey?: string
}

export interface Job {
  id: string
  type: JobType
  payload: JobPayload
  status: JobStatus
  runAt: string
  attempts: number
  maxAttempts: number
  lastError: string | null
  claimedAt: string | null
  lockedBy: string | null
  idempotencyKey: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

export const SKIPPED_DO_NOT_CONTACT = 'skipped:do_not_contact'

export function countsAsDmSlot(job: Pick<Job, 'type' | 'status' | 'lastError'>): boolean {
  return isSendJobType(job.type) && job.status === 'succeeded' && job.lastError === null
}
