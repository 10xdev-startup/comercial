export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'dead_letter'

export type JobType = 'record_timeline' | 'noop'

export interface JobPayload {
  leadId?: string
  body?: string
  source?: 'browser' | 'api' | 'system'
  direction?: 'inbound' | 'outbound'
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
