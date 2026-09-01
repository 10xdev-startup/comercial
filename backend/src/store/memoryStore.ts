import type { AiUsageEntry, Campaign, Conversation, DoNotContactEntry, Experiment, Funnel, Lead, Message, SystemState } from '@/types/crm'
import type { Job, JobPayload, JobStatus, JobType } from '@/types/job'

function iso(date = new Date()): string {
  return date.toISOString()
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

export interface MemorySnapshot {
  leads: Lead[]
  conversations: Conversation[]
  messages: Message[]
  campaigns: Campaign[]
  experiments: Experiment[]
  jobs: Job[]
  aiUsage: AiUsageEntry[]
  doNotContact: DoNotContactEntry[]
  system: SystemState
}

const DEMO_NOW = '2026-09-01T12:00:00.000Z'

function demoLead(partial: Omit<Lead, 'createdAt' | 'updatedAt' | 'tags' | 'roleGuess'> & Partial<Pick<Lead, 'tags' | 'roleGuess'>>): Lead {
  return {
    tags: [],
    roleGuess: 'unknown',
    createdAt: DEMO_NOW,
    updatedAt: DEMO_NOW,
    ...partial,
  }
}

function seedLeads(): Lead[] {
  return [
    demoLead({
      id: 'lead-loja-centro',
      instagramHandle: 'loja_centro',
      displayName: 'Loja Centro',
      bio: 'Moda feminina no centro de SP',
      funnel: 'customer',
      pipelineState: 'discovered',
      channelState: 'browser_contact_pending',
      score: 72,
      niche: 'moda',
      origin: 'keyword:moda',
      roleGuess: 'store',
      nextAction: 'qualify',
      nextActionAt: null,
      campaignId: null,
      experimentId: null,
      experimentVariant: null,
      metaIgsid: null,
      lastContactedAt: null,
    }),
    demoLead({
      id: 'lead-maria-store',
      instagramHandle: 'maria_store',
      displayName: 'Maria Store',
      bio: 'Dona da loja — atacado e varejo',
      funnel: 'customer',
      pipelineState: 'qualified',
      channelState: 'browser_contact_pending',
      score: 88,
      niche: 'varejo',
      origin: 'keyword:loja',
      roleGuess: 'owner',
      nextAction: 'send_first_dm',
      nextActionAt: DEMO_NOW,
      campaignId: null,
      experimentId: null,
      experimentVariant: null,
      metaIgsid: null,
      lastContactedAt: null,
    }),
    demoLead({
      id: 'lead-joao-moda',
      instagramHandle: 'joao_moda',
      displayName: 'João Moda',
      bio: 'Looks do dia',
      funnel: 'customer',
      pipelineState: 'contacted',
      channelState: 'waiting_inbound_reply',
      score: 64,
      niche: 'moda',
      origin: 'hashtag',
      roleGuess: 'owner',
      nextAction: 'wait_reply',
      nextActionAt: null,
      campaignId: null,
      experimentId: null,
      experimentVariant: null,
      metaIgsid: null,
      lastContactedAt: DEMO_NOW,
    }),
    demoLead({
      id: 'lead-ana-replied',
      instagramHandle: 'ana_replied',
      displayName: 'Ana Lima',
      bio: 'Boutique em BH',
      funnel: 'customer',
      pipelineState: 'replied',
      channelState: 'api_active',
      score: 91,
      niche: 'boutique',
      origin: 'keyword:boutique',
      roleGuess: 'decision_maker',
      nextAction: 'present_offer',
      nextActionAt: null,
      campaignId: null,
      experimentId: null,
      experimentVariant: 'opener_a',
      metaIgsid: 'igsid-ana',
      lastContactedAt: DEMO_NOW,
    }),
    demoLead({
      id: 'lead-creator-fit',
      instagramHandle: 'creator_fit',
      displayName: 'Criadora Fit',
      bio: 'Treino e rotina — 80k',
      funnel: 'affiliate',
      pipelineState: 'discovered',
      channelState: 'browser_contact_pending',
      score: 70,
      niche: 'fitness',
      origin: 'topic:fitness',
      roleGuess: 'unknown',
      nextAction: 'qualify',
      nextActionAt: null,
      campaignId: null,
      experimentId: null,
      experimentVariant: null,
      metaIgsid: null,
      lastContactedAt: null,
    }),
    demoLead({
      id: 'lead-opted-out',
      instagramHandle: 'nao_quero',
      displayName: 'Opt-out',
      bio: null,
      funnel: 'customer',
      pipelineState: 'closed',
      channelState: 'do_not_contact',
      score: 0,
      niche: null,
      origin: 'inbound',
      nextAction: null,
      nextActionAt: null,
      campaignId: null,
      experimentId: null,
      experimentVariant: null,
      metaIgsid: null,
      lastContactedAt: DEMO_NOW,
    }),
  ]
}

function seedMessages(): { conversations: Conversation[]; messages: Message[] } {
  const conversations: Conversation[] = [
    {
      id: 'conv-joao',
      leadId: 'lead-joao-moda',
      channelOwner: 'browser',
      messagingWindowExpiresAt: null,
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    },
    {
      id: 'conv-ana',
      leadId: 'lead-ana-replied',
      channelOwner: 'api',
      messagingWindowExpiresAt: '2026-09-02T12:00:00.000Z',
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    },
  ]
  const messages: Message[] = [
    {
      id: 'msg-joao-1',
      conversationId: 'conv-joao',
      leadId: 'lead-joao-moda',
      direction: 'outbound',
      source: 'browser',
      body: 'Oi João, vi o look de ontem da vitrine — faz sentido pra loja de vocês?',
      variant: 'opener_a',
      jobId: null,
      externalId: null,
      createdAt: DEMO_NOW,
    },
    {
      id: 'msg-ana-1',
      conversationId: 'conv-ana',
      leadId: 'lead-ana-replied',
      direction: 'outbound',
      source: 'browser',
      body: 'Oi Ana, a boutique em BH chamou atenção pelo mix de peças.',
      variant: 'opener_a',
      jobId: null,
      externalId: 'browser-ana-1',
      createdAt: DEMO_NOW,
    },
    {
      id: 'msg-ana-2',
      conversationId: 'conv-ana',
      leadId: 'lead-ana-replied',
      direction: 'inbound',
      source: 'api',
      body: 'Oi! Quero saber mais.',
      variant: null,
      jobId: null,
      externalId: 'mid-ana-2',
      createdAt: DEMO_NOW,
    },
  ]
  return { conversations, messages }
}

export class MemoryCrmStore {
  leads = new Map<string, Lead>()
  conversations = new Map<string, Conversation>()
  messages = new Map<string, Message>()
  campaigns = new Map<string, Campaign>()
  experiments = new Map<string, Experiment>()
  jobs = new Map<string, Job>()
  aiUsage: AiUsageEntry[] = []
  doNotContact = new Map<string, DoNotContactEntry>()
  system: SystemState = { paused: false, pauseReason: null, updatedAt: iso() }

  reset(withDemo = true): void {
    this.leads.clear()
    this.conversations.clear()
    this.messages.clear()
    this.campaigns.clear()
    this.experiments.clear()
    this.jobs.clear()
    this.aiUsage = []
    this.doNotContact.clear()
    this.system = { paused: false, pauseReason: null, updatedAt: iso() }
    if (!withDemo) return
    for (const lead of seedLeads()) this.leads.set(lead.id, lead)
    const { conversations, messages } = seedMessages()
    for (const conv of conversations) this.conversations.set(conv.id, conv)
    for (const msg of messages) this.messages.set(msg.id, msg)
    this.doNotContact.set('nao_quero', {
      id: 'dnc-nao-quero',
      instagramHandle: 'nao_quero',
      reason: 'opt_out',
      source: 'inbound',
      createdAt: DEMO_NOW,
    })
  }

  snapshot(): MemorySnapshot {
    return {
      leads: [...this.leads.values()].map(clone),
      conversations: [...this.conversations.values()].map(clone),
      messages: [...this.messages.values()].map(clone),
      campaigns: [...this.campaigns.values()].map(clone),
      experiments: [...this.experiments.values()].map(clone),
      jobs: [...this.jobs.values()].map(clone),
      aiUsage: this.aiUsage.map(clone),
      doNotContact: [...this.doNotContact.values()].map(clone),
      system: clone(this.system),
    }
  }

  normalizeHandle(handle: string): string {
    return handle.replace(/^@/, '').trim().toLowerCase()
  }

  findLeadByHandle(handle: string): Lead | null {
    const key = this.normalizeHandle(handle)
    for (const lead of this.leads.values()) {
      if (this.normalizeHandle(lead.instagramHandle) === key) return clone(lead)
    }
    return null
  }

  insertLead(lead: Lead): Lead {
    if (this.findLeadByHandle(lead.instagramHandle)) {
      throw new Error(`Duplicate lead: ${lead.instagramHandle}`)
    }
    this.leads.set(lead.id, clone(lead))
    return clone(lead)
  }

  updateLead(id: string, patch: Partial<Lead>): Lead {
    const current = this.leads.get(id)
    if (!current) throw new Error(`Lead not found: ${id}`)
    const next = { ...current, ...patch, id: current.id, updatedAt: iso() }
    this.leads.set(id, next)
    return clone(next)
  }

  listLeads(funnel?: Funnel): Lead[] {
    const rows = [...this.leads.values()]
    const filtered = funnel ? rows.filter((row) => row.funnel === funnel) : rows
    return filtered.map(clone)
  }

  getLead(id: string): Lead | null {
    const row = this.leads.get(id)
    return row ? clone(row) : null
  }

  getOrCreateConversation(leadId: string): Conversation {
    for (const conv of this.conversations.values()) {
      if (conv.leadId === leadId) return clone(conv)
    }
    const created: Conversation = {
      id: crypto.randomUUID(),
      leadId,
      channelOwner: 'none',
      messagingWindowExpiresAt: null,
      createdAt: iso(),
      updatedAt: iso(),
    }
    this.conversations.set(created.id, created)
    return clone(created)
  }

  updateConversation(id: string, patch: Partial<Conversation>): Conversation {
    const current = this.conversations.get(id)
    if (!current) throw new Error(`Conversation not found: ${id}`)
    const next = { ...current, ...patch, id: current.id, updatedAt: iso() }
    this.conversations.set(id, next)
    return clone(next)
  }

  insertMessage(message: Message): Message {
    if (message.externalId) {
      for (const existing of this.messages.values()) {
        if (existing.externalId === message.externalId) return clone(existing)
      }
    }
    this.messages.set(message.id, clone(message))
    return clone(message)
  }

  listMessages(leadId: string): Message[] {
    return [...this.messages.values()]
      .filter((row) => row.leadId === leadId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(clone)
  }

  findMessageByExternalId(externalId: string): Message | null {
    for (const row of this.messages.values()) {
      if (row.externalId === externalId) return clone(row)
    }
    return null
  }

  enqueueJob(input: {
    type: JobType
    payload: JobPayload
    runAt?: string
    maxAttempts?: number
    idempotencyKey?: string
  }): Job {
    if (input.idempotencyKey) {
      for (const existing of this.jobs.values()) {
        if (existing.idempotencyKey === input.idempotencyKey) return clone(existing)
      }
    }
    const now = iso()
    const job: Job = {
      id: crypto.randomUUID(),
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
    const eligible = [...this.jobs.values()]
      .filter((job) => job.status === 'pending' && Date.parse(job.runAt) <= now.getTime())
      .sort((a, b) => a.runAt.localeCompare(b.runAt) || a.createdAt.localeCompare(b.createdAt))
    const job = eligible[0]
    if (!job) return null
    job.status = 'running'
    job.claimedAt = iso(now)
    job.lockedBy = workerId
    job.attempts += 1
    job.updatedAt = iso(now)
    return clone(job)
  }

  finishJob(id: string, status: Exclude<JobStatus, 'pending' | 'running'>, lastError?: string): Job {
    const job = this.jobs.get(id)
    if (!job) throw new Error(`Job not found: ${id}`)
    job.status = status
    job.lastError = lastError ?? null
    job.finishedAt = iso()
    job.lockedBy = null
    job.updatedAt = iso()
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
    job.updatedAt = iso()
    return clone(job)
  }

  recoverStuckJobs(staleMs: number, now = new Date()): number {
    let recovered = 0
    for (const job of this.jobs.values()) {
      if (job.status !== 'running' || !job.claimedAt) continue
      if (now.getTime() - Date.parse(job.claimedAt) < staleMs) continue
      if (job.attempts >= job.maxAttempts) {
        job.status = 'dead_letter'
        job.lastError = job.lastError ?? 'stuck_running'
        job.finishedAt = iso(now)
      } else {
        job.status = 'pending'
      }
      job.lockedBy = null
      job.claimedAt = null
      job.updatedAt = iso(now)
      recovered += 1
    }
    return recovered
  }

  listJobs(): Job[] {
    return [...this.jobs.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(clone)
  }

  addDoNotContact(entry: DoNotContactEntry): DoNotContactEntry {
    const key = this.normalizeHandle(entry.instagramHandle)
    const existing = this.doNotContact.get(key)
    if (existing) return clone(existing)
    const stored = { ...entry, instagramHandle: key }
    this.doNotContact.set(key, stored)
    return clone(stored)
  }

  isDoNotContact(handle: string): boolean {
    return this.doNotContact.has(this.normalizeHandle(handle))
  }

  recordAiUsage(entry: AiUsageEntry): AiUsageEntry {
    this.aiUsage.push(clone(entry))
    return clone(entry)
  }

  monthSpendUsd(now = new Date()): number {
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    return this.aiUsage
      .filter((row) => row.createdAt.startsWith(month))
      .reduce((sum, row) => sum + row.estimatedCostUsd, 0)
  }

  setPaused(paused: boolean, reason: string | null): SystemState {
    this.system = { paused, pauseReason: paused ? reason : null, updatedAt: iso() }
    return clone(this.system)
  }

  countOutboundDmsSince(sinceIso: string): number {
    return [...this.messages.values()].filter(
      (row) => row.direction === 'outbound' && row.source === 'browser' && row.createdAt >= sinceIso,
    ).length
  }

  lastBrowserOutboundAt(): string | null {
    let latest: string | null = null
    for (const row of this.messages.values()) {
      if (row.direction !== 'outbound' || row.source !== 'browser') continue
      if (!latest || row.createdAt > latest) latest = row.createdAt
    }
    return latest
  }
}

let singleton: MemoryCrmStore | null = null

export function getMemoryStore(): MemoryCrmStore {
  if (!singleton) {
    singleton = new MemoryCrmStore()
    singleton.reset(true)
  }
  return singleton
}

export function resetMemoryStore(withDemo = true): MemoryCrmStore {
  const store = getMemoryStore()
  store.reset(withDemo)
  return store
}
