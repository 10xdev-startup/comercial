export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'dead_letter'

export type JobType = 'send_first_dm' | 'follow_up' | 'process_inbound'

export interface JobPayload {
  leadId?: string
  conversationId?: string
  messageId?: string
  text?: string
  variant?: string
  dryRun?: boolean
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
