import { JobModel } from '@/models/JobModel'
import type { Job, JobPayload, SendJobType } from '@/types/job'

export function sendLockKey(type: SendJobType, leadId: string, followUpKey?: string): string {
  if (type === 'follow_up' && followUpKey) return `follow_up:${leadId}:${followUpKey}`
  return `${type}:${leadId}`
}

export async function enqueueUniqueSend(input: {
  type: SendJobType
  leadId: string
  followUpKey?: string
  runAt?: string
  body?: string
}): Promise<{ job: Job; duplicate: boolean }> {
  const key = input.followUpKey !== undefined
    ? sendLockKey(input.type, input.leadId, input.followUpKey)
    : sendLockKey(input.type, input.leadId)
  const existing = await JobModel.findByIdempotencyKey(key)
  if (existing) return { job: existing, duplicate: true }

  const payload: JobPayload = { leadId: input.leadId }
  if (input.followUpKey !== undefined) payload.followUpKey = input.followUpKey
  if (input.body !== undefined) payload.body = input.body

  const enqueueInput: {
    type: SendJobType
    payload: JobPayload
    idempotencyKey: string
    runAt?: string
  } = {
    type: input.type,
    payload,
    idempotencyKey: key,
  }
  if (input.runAt !== undefined) enqueueInput.runAt = input.runAt

  const job = await JobModel.enqueue(enqueueInput)
  return { job, duplicate: false }
}
