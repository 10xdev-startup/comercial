import { isDatabaseConfigured } from '@/database/isConfigured'
import { supabase } from '@/database/supabase'
import { rowToJob, type JobRow } from '@/models/crmMappers'
import { getMemoryStore } from '@/store/memoryStore'
import { SEND_JOB_TYPES, type Job, type JobPayload, type JobStatus, type JobType } from '@/types/job'

export interface JobFinishOptions {
  lastError?: string
  at?: Date
}

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
    if (input.idempotencyKey) {
      const { data: existing } = await supabase
        .from('jobs')
        .select('*')
        .eq('idempotency_key', input.idempotencyKey)
        .maybeSingle()
      if (existing) return rowToJob(existing as JobRow)
    }
    const now = new Date().toISOString()
    const insert: Record<string, unknown> = {
      type: input.type,
      payload: input.payload,
      status: 'pending',
      run_at: input.runAt ?? now,
      max_attempts: input.maxAttempts ?? 5,
      created_at: now,
      updated_at: now,
    }
    if (input.idempotencyKey !== undefined) insert['idempotency_key'] = input.idempotencyKey
    const { data, error } = await supabase.from('jobs').insert(insert).select('*').single()
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

  async findByIdempotencyKey(key: string): Promise<Job | null> {
    if (useMemory()) return getMemoryStore().findJobByIdempotencyKey(key)
    const { data, error } = await supabase.from('jobs').select('*').eq('idempotency_key', key).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToJob(data as JobRow) : null
  },

  async finish(id: string, status: Exclude<JobStatus, 'pending' | 'running'>, options: JobFinishOptions = {}): Promise<Job> {
    const at = options.at ?? new Date()
    const lastError = options.lastError ?? null
    if (useMemory()) return getMemoryStore().finishJob(id, status, lastError, at)
    const { data, error } = await supabase
      .from('jobs')
      .update({
        status,
        last_error: lastError,
        finished_at: at.toISOString(),
        locked_by: null,
        updated_at: at.toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToJob(data as JobRow)
  },

  async defer(id: string, runAt: string, lastError: string): Promise<Job> {
    if (useMemory()) return getMemoryStore().deferJob(id, runAt, lastError)
    const { data: current, error: readError } = await supabase.from('jobs').select('attempts').eq('id', id).single()
    if (readError) throw new Error(readError.message)
    const attemptsValue = (current as { attempts?: number } | null)?.attempts
    const attempts = Math.max(0, (typeof attemptsValue === 'number' ? attemptsValue : 1) - 1)
    const { data, error } = await supabase
      .from('jobs')
      .update({
        status: 'pending',
        run_at: runAt,
        last_error: lastError,
        claimed_at: null,
        locked_by: null,
        finished_at: null,
        attempts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToJob(data as JobRow)
  },

  async reschedule(id: string, runAt: string, lastError?: string): Promise<Job> {
    if (useMemory()) return getMemoryStore().rescheduleJob(id, runAt, lastError ?? null)
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
    const { data, error } = await supabase.from('jobs').select('*').eq('status', 'running').lt('claimed_at', cutoff)
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

  async countSucceededDmJobsSince(sinceIso: string): Promise<number> {
    if (useMemory()) return getMemoryStore().countSucceededDmJobsSince(sinceIso)
    const { count, error } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .in('type', [...SEND_JOB_TYPES])
      .eq('status', 'succeeded')
      .is('last_error', null)
      .gte('finished_at', sinceIso)
    if (error) throw new Error(error.message)
    return count ?? 0
  },

  async latestSucceededDmFinishedAt(): Promise<string | null> {
    if (useMemory()) return getMemoryStore().latestSucceededDmFinishedAt()
    const { data, error } = await supabase
      .from('jobs')
      .select('finished_at')
      .in('type', [...SEND_JOB_TYPES])
      .eq('status', 'succeeded')
      .is('last_error', null)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    const row = data as { finished_at: string | null } | null
    return row?.finished_at ?? null
  },

  async list(): Promise<Job[]> {
    if (useMemory()) return getMemoryStore().listJobs()
    const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(100)
    if (error) throw new Error(error.message)
    return ((data ?? []) as JobRow[]).map(rowToJob)
  },
}
