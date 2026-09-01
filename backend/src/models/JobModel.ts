import { isDatabaseConfigured } from '@/database/isConfigured'
import { supabase } from '@/database/supabase'
import { rowToJob, type JobRow } from '@/models/crmMappers'
import { getMemoryStore } from '@/store/memoryStore'
import type { Job, JobPayload, JobStatus, JobType } from '@/types/job'

function useMemory(): boolean {
  return !isDatabaseConfigured()
}

export const JobModel = {
  async enqueue(input: {
    type: JobType
    payload: JobPayload
    runAt?: string
    maxAttempts?: number
    idempotencyKey?: string
  }): Promise<Job> {
    if (useMemory()) return getMemoryStore().enqueueJob(input)
    const now = new Date().toISOString()
    if (input.idempotencyKey) {
      const { data: existing } = await supabase.from('jobs').select('*').eq('idempotency_key', input.idempotencyKey).maybeSingle()
      if (existing) return rowToJob(existing as JobRow)
    }
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        type: input.type,
        payload: input.payload,
        status: 'pending',
        run_at: input.runAt ?? now,
        max_attempts: input.maxAttempts ?? 5,
        idempotency_key: input.idempotencyKey ?? null,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToJob(data as JobRow)
  },

  async claimNext(workerId: string, now = new Date()): Promise<Job | null> {
    if (useMemory()) return getMemoryStore().claimNextJob(workerId, now)
    const { data, error } = await supabase.rpc('claim_next_job', { p_worker_id: workerId })
    if (error) throw new Error(error.message)
    const row = Array.isArray(data) ? data[0] : data
    return row ? rowToJob(row as JobRow) : null
  },

  async finish(id: string, status: Exclude<JobStatus, 'pending' | 'running'>, lastError?: string): Promise<Job> {
    if (useMemory()) return getMemoryStore().finishJob(id, status, lastError)
    const { data, error } = await supabase
      .from('jobs')
      .update({
        status,
        last_error: lastError ?? null,
        finished_at: new Date().toISOString(),
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToJob(data as JobRow)
  },

  async reschedule(id: string, runAt: string, lastError?: string): Promise<Job> {
    if (useMemory()) return getMemoryStore().rescheduleJob(id, runAt, lastError)
    const { data, error } = await supabase
      .from('jobs')
      .update({
        status: 'pending',
        run_at: runAt,
        last_error: lastError ?? null,
        claimed_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToJob(data as JobRow)
  },

  async recoverStuck(staleMs: number, now = new Date()): Promise<number> {
    if (useMemory()) return getMemoryStore().recoverStuckJobs(staleMs, now)
    const cutoff = new Date(now.getTime() - staleMs).toISOString()
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'running')
      .lt('claimed_at', cutoff)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as JobRow[]
    for (const row of rows) {
      const nextStatus = row.attempts >= row.max_attempts ? 'dead_letter' : 'pending'
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: nextStatus,
          locked_by: null,
          claimed_at: null,
          last_error: row.last_error ?? 'stuck_running',
          finished_at: nextStatus === 'dead_letter' ? now.toISOString() : null,
          updated_at: now.toISOString(),
        })
        .eq('id', row.id)
      if (updateError) throw new Error(updateError.message)
    }
    return rows.length
  },

  async list(): Promise<Job[]> {
    if (useMemory()) return getMemoryStore().listJobs()
    const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(100)
    if (error) throw new Error(error.message)
    return ((data ?? []) as JobRow[]).map(rowToJob)
  },
}
