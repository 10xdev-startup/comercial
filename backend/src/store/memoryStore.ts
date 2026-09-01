import { randomUUID } from 'crypto'
import type { Conversation, DoNotContactEntry, Lead, Message, SystemState } from '@/types/crm'
import type { Job, JobPayload, JobStatus, JobType } from '@/types/job'

function nowIso(now = new Date()): string {
  return now.toISOString()
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

class MemoryStore {
  leads = new Map<string, Lead>()
  conversations = new Map<string, Conversation>()
  messages: Message[] = []
  jobs = new Map<string, Job>()
  dnc = new Map<string, DoNotContactEntry>()
  system: SystemState = { paused: false, pauseReason: null, updatedAt: nowIso() }

  listLeads(): Lead[] {
    return [...this.leads.values()]
      .map(clone)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  findLead(id: string): Lead | null {
    const lead = this.leads.get(id)
    return lead ? clone(lead) : null
  }

  findLeadByHandle(handle: string): Lead | null {
    const needle = handle.trim().toLowerCase()
    for (const lead of this.leads.values()) {
      if (lead.instagramHandle.toLowerCase() === needle) return clone(lead)
    }
    return null
  }

  insertLead(lead: Lead, conversation: Conversation): Lead {
    this.leads.set(lead.id, clone(lead))
    this.conversations.set(conversation.id, clone(conversation))
    return clone(lead)
  }

  saveLead(lead: Lead): Lead {
    this.leads.set(lead.id, clone(lead))
    return clone(lead)
  }

  getOrCreateConversation(leadId: string): Conversation {
    for (const row of this.conversations.values()) {
      if (row.leadId === leadId) return clone(row)
    }
    const now = nowIso()
    const conversation: Conversation = {
      id: randomUUID(),
      leadId,
      channelOwner: 'none',
      messagingWindowExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.conversations.set(conversation.id, conversation)
    return clone(conversation)
  }

  listMessages(leadId: string): Message[] {
    return this.messages
      .filter((message) => message.leadId === leadId)
      .map(clone)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  insertMessage(message: Message): Message {
    this.messages.push(clone(message))
    return clone(message)
  }

  hasDoNotContact(handle: string): boolean {
    return this.dnc.has(handle.trim().toLowerCase())
  }

  addDoNotContact(entry: DoNotContactEntry): DoNotContactEntry {
    this.dnc.set(entry.instagramHandle.toLowerCase(), clone(entry))
    return clone(entry)
  }

  getSystem(): SystemState {
    return clone(this.system)
  }

  setPaused(paused: boolean, reason: string | null): SystemState {
    this.system = { paused, pauseReason: paused ? reason : null, updatedAt: nowIso() }
    return clone(this.system)
  }

  enqueueJob(input: {
    type: JobType
    payload: JobPayload
    runAt?: string
    maxAttempts?: number
    idempotencyKey?: string
  }): Job {
    if (input.idempotencyKey) {
      for (const job of this.jobs.values()) {
        if (job.idempotencyKey === input.idempotencyKey) return clone(job)
      }
    }
    const now = nowIso()
    const job: Job = {
      id: randomUUID(),
      type: input.type,
      payload: input.payload,
      status: 'pending',
      runAt: input.runAt ?? now,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 5,
      lastError: null,
      claimedAt: null,
      lockedBy: null,
      idempotencyKey: input.idempotencyKey ?? null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.jobs.set(job.id, job)
    return clone(job)
  }

  claimNextJob(workerId: string, now = new Date()): Job | null {
    const due = [...this.jobs.values()]
      .filter((job) => job.status === 'pending' && job.runAt <= nowIso(now))
      .sort((a, b) => a.runAt.localeCompare(b.runAt))
    const next = due[0]
    if (!next) return null
    next.status = 'running'
    next.claimedAt = nowIso(now)
    next.lockedBy = workerId
    next.attempts += 1
    next.updatedAt = nowIso(now)
    return clone(next)
  }

  finishJob(id: string, status: Exclude<JobStatus, 'pending' | 'running'>, lastError?: string): Job {
    const job = this.jobs.get(id)
    if (!job) throw new Error(`Job not found: ${id}`)
    job.status = status
    job.lastError = lastError ?? null
    job.finishedAt = nowIso()
    job.lockedBy = null
    job.updatedAt = nowIso()
    return clone(job)
  }

  rescheduleJob(id: string, runAt: string, lastError?: string): Job {
    const job = this.jobs.get(id)
    if (!job) throw new Error(`Job not found: ${id}`)
    job.status = 'pending'
    job.runAt = runAt
    job.lastError = lastError ?? null
    job.claimedAt = null
    job.lockedBy = null
    job.updatedAt = nowIso()
    return clone(job)
  }

  recoverStuckJobs(staleMs: number, now = new Date()): number {
    const cutoff = now.getTime() - staleMs
    let count = 0
    for (const job of this.jobs.values()) {
      if (job.status !== 'running' || !job.claimedAt) continue
      if (new Date(job.claimedAt).getTime() > cutoff) continue
      job.status = job.attempts >= job.maxAttempts ? 'dead_letter' : 'pending'
      job.lockedBy = null
      job.claimedAt = null
      job.lastError = job.lastError ?? 'stuck_running'
      if (job.status === 'dead_letter') job.finishedAt = nowIso(now)
      job.updatedAt = nowIso(now)
      count += 1
    }
    return count
  }

  listJobs(): Job[] {
    return [...this.jobs.values()]
      .map(clone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

let store = new MemoryStore()

export function getMemoryStore(): MemoryStore {
  return store
}

export function resetMemoryStore(): void {
  store = new MemoryStore()
}
