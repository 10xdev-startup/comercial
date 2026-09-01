import { randomUUID } from 'crypto'
import { isDatabaseConfigured } from '@/database/isConfigured'
import { supabase } from '@/database/supabase'
import { canChangeChannel, isChannelState } from '@/domain/channel'
import { assertPipelineTransition, isClientPipelineState } from '@/domain/pipeline'
import { rowToConversation, rowToLead, rowToMessage, type ConversationRow, type LeadRow, type MessageRow } from '@/models/crmMappers'
import { getMemoryStore } from '@/store/memoryStore'
import type { ChannelState, ClientPipelineState, Conversation, Lead, LeadRoleGuess, Message } from '@/types/crm'

const LEAD_COLUMNS =
  'id, instagram_handle, display_name, bio, pipeline_state, channel_state, score, niche, tags, origin, role_guess, next_action, next_action_at, campaign_id, experiment_id, experiment_variant, last_contacted_at, created_at, updated_at'

function useMemory(): boolean {
  return !isDatabaseConfigured()
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '')
}

export interface CreateLeadInput {
  instagramHandle: string
  displayName?: string | null
  bio?: string | null
  score?: number
  niche?: string | null
  tags?: string[]
  origin?: string | null
  roleGuess?: LeadRoleGuess
}

export interface UpdateLeadInput {
  pipelineState?: ClientPipelineState
  channelState?: ChannelState
  nextAction?: string | null
  score?: number
  lastContactedAt?: string
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export const LeadModel = {
  async list(): Promise<Lead[]> {
    if (useMemory()) return getMemoryStore().listLeads()
    const { data, error } = await supabase.from('leads').select(LEAD_COLUMNS).order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as LeadRow[]).map(rowToLead)
  },

  async findById(id: string): Promise<Lead | null> {
    if (useMemory()) return getMemoryStore().findLead(id)
    const { data, error } = await supabase.from('leads').select(LEAD_COLUMNS).eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToLead(data as LeadRow) : null
  },

  async findByHandle(handle: string): Promise<Lead | null> {
    const normalized = normalizeHandle(handle)
    if (useMemory()) return getMemoryStore().findLeadByHandle(normalized)
    const { data, error } = await supabase.from('leads').select(LEAD_COLUMNS).ilike('instagram_handle', escapeIlike(normalized)).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToLead(data as LeadRow) : null
  },

  async create(input: CreateLeadInput): Promise<Lead> {
    const handle = normalizeHandle(input.instagramHandle)
    if (!handle) throw new Error('instagramHandle is required')
    const now = new Date().toISOString()
    const lead: Lead = {
      id: randomUUID(),
      instagramHandle: handle,
      displayName: input.displayName ?? null,
      bio: input.bio ?? null,
      pipelineState: 'discovered',
      channelState: 'browser_contact_pending',
      score: input.score ?? 0,
      niche: input.niche ?? null,
      tags: input.tags ?? [],
      origin: input.origin ?? null,
      roleGuess: input.roleGuess ?? 'unknown',
      nextAction: null,
      nextActionAt: null,
      campaignId: null,
      experimentId: null,
      experimentVariant: null,
      lastContactedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    const conversation: Conversation = {
      id: randomUUID(),
      leadId: lead.id,
      channelOwner: 'none',
      messagingWindowExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    }
    if (useMemory()) return getMemoryStore().insertLead(lead, conversation)

    const { data, error } = await supabase.from('leads').insert({
        id: lead.id,
        instagram_handle: lead.instagramHandle,
        display_name: lead.displayName,
        bio: lead.bio,
        pipeline_state: lead.pipelineState,
        channel_state: lead.channelState,
        score: lead.score,
        niche: lead.niche,
        tags: lead.tags,
        origin: lead.origin,
        role_guess: lead.roleGuess,
        created_at: now,
        updated_at: now,
      })
      .select(LEAD_COLUMNS)
      .single()
    if (error) {
      if (error.code === '23505') throw new Error('Lead already exists')
      throw new Error(error.message)
    }
    const { error: convError } = await supabase.from('conversations').insert({
      id: conversation.id,
      lead_id: lead.id,
      channel_owner: 'none',
      created_at: now,
      updated_at: now,
    })
    if (convError) throw new Error(convError.message)
    return rowToLead(data as LeadRow)
  },

  async update(id: string, patch: UpdateLeadInput): Promise<Lead> {
    const current = await LeadModel.findById(id)
    if (!current) throw new Error(`Lead not found: ${id}`)
    if (patch.pipelineState !== undefined) {
      if (!isClientPipelineState(patch.pipelineState)) throw new Error('Invalid pipeline state')
      assertPipelineTransition(current.pipelineState, patch.pipelineState)
    }
    if (patch.channelState !== undefined) {
      if (!isChannelState(patch.channelState)) throw new Error('Invalid channel state')
      if (!canChangeChannel(current.channelState, patch.channelState)) {
        throw new Error(`Invalid channel transition: ${current.channelState} -> ${patch.channelState}`)
      }
    }

    if (useMemory()) {
      const next: Lead = {
        ...current,
        pipelineState: patch.pipelineState ?? current.pipelineState,
        channelState: patch.channelState ?? current.channelState,
        nextAction: patch.nextAction !== undefined ? patch.nextAction : current.nextAction,
        score: patch.score ?? current.score,
        lastContactedAt: patch.lastContactedAt !== undefined ? patch.lastContactedAt : current.lastContactedAt,
        updatedAt: new Date().toISOString(),
      }
      return getMemoryStore().saveLead(next)
    }

    const fields: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.pipelineState !== undefined) fields['pipeline_state'] = patch.pipelineState
    if (patch.channelState !== undefined) fields['channel_state'] = patch.channelState
    if (patch.nextAction !== undefined) fields['next_action'] = patch.nextAction
    if (patch.score !== undefined) fields['score'] = patch.score
    if (patch.lastContactedAt !== undefined) fields['last_contacted_at'] = patch.lastContactedAt
    const { data, error } = await supabase.from('leads').update(fields).eq('id', id).select(LEAD_COLUMNS).single()
    if (error) throw new Error(error.message)
    return rowToLead(data as LeadRow)
  },

  async getOrCreateConversation(leadId: string): Promise<Conversation> {
    if (useMemory()) return getMemoryStore().getOrCreateConversation(leadId)
    const { data, error } = await supabase.from('conversations').select('*').eq('lead_id', leadId).maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return rowToConversation(data as ConversationRow)
    const now = new Date().toISOString()
    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({ lead_id: leadId, channel_owner: 'none', created_at: now, updated_at: now })
      .select('*')
      .single()
    if (createError) throw new Error(createError.message)
    return rowToConversation(created as ConversationRow)
  },

  async listMessages(leadId: string): Promise<Message[]> {
    if (useMemory()) return getMemoryStore().listMessages(leadId)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return ((data ?? []) as MessageRow[]).map(rowToMessage)
  },

  async appendMessage(input: {
    leadId: string
    body: string
    direction?: Message['direction']
    source?: Message['source']
    jobId?: string | null
  }): Promise<Message> {
    const conversation = await LeadModel.getOrCreateConversation(input.leadId)
    const message: Message = {
      id: randomUUID(),
      conversationId: conversation.id,
      leadId: input.leadId,
      direction: input.direction ?? 'outbound',
      source: input.source ?? 'system',
      body: input.body,
      variant: null,
      jobId: input.jobId ?? null,
      externalId: null,
      createdAt: new Date().toISOString(),
    }
    if (useMemory()) return getMemoryStore().insertMessage(message)
    const { data, error } = await supabase
      .from('messages')
      .insert({
        id: message.id,
        conversation_id: message.conversationId,
        lead_id: message.leadId,
        direction: message.direction,
        source: message.source,
        body: message.body,
        job_id: message.jobId,
        created_at: message.createdAt,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToMessage(data as MessageRow)
  },
}
