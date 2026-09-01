import { isDatabaseConfigured } from '@/database/isConfigured'
import { supabase } from '@/database/supabase'
import { assertPipelineTransition } from '@/domain/pipeline'
import { leadToRow, rowToConversation, rowToLead, rowToMessage, type ConversationRow, type LeadRow, type MessageRow } from '@/models/crmMappers'
import { getMemoryStore } from '@/store/memoryStore'
import type { ChannelState, Conversation, Funnel, Lead, Message, PipelineState } from '@/types/crm'

const LEAD_COLUMNS =
  'id, instagram_handle, display_name, bio, funnel, pipeline_state, channel_state, score, niche, tags, origin, role_guess, next_action, next_action_at, campaign_id, experiment_id, experiment_variant, meta_igsid, last_contacted_at, created_at, updated_at'

function useMemory(): boolean {
  return !isDatabaseConfigured()
}

export const LeadModel = {
  async list(funnel?: Funnel): Promise<Lead[]> {
    if (useMemory()) return getMemoryStore().listLeads(funnel)
    let query = supabase.from('leads').select(LEAD_COLUMNS).order('updated_at', { ascending: false })
    if (funnel) query = query.eq('funnel', funnel)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return ((data ?? []) as LeadRow[]).map(rowToLead)
  },

  async findById(id: string): Promise<Lead | null> {
    if (useMemory()) return getMemoryStore().getLead(id)
    const { data, error } = await supabase.from('leads').select(LEAD_COLUMNS).eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToLead(data as LeadRow) : null
  },

  async findByHandle(handle: string): Promise<Lead | null> {
    if (useMemory()) return getMemoryStore().findLeadByHandle(handle)
    const normalized = handle.replace(/^@/, '').trim().toLowerCase()
    const { data, error } = await supabase.from('leads').select(LEAD_COLUMNS)
    if (error) throw new Error(error.message)
    const row = ((data ?? []) as LeadRow[]).find(
      (item) => item.instagram_handle.replace(/^@/, '').trim().toLowerCase() === normalized,
    )
    return row ? rowToLead(row) : null
  },

  async findByMetaIgsid(igsid: string): Promise<Lead | null> {
    if (useMemory()) {
      const match = getMemoryStore().listLeads().find((lead) => lead.metaIgsid === igsid)
      return match ?? null
    }
    const { data, error } = await supabase.from('leads').select(LEAD_COLUMNS).eq('meta_igsid', igsid).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToLead(data as LeadRow) : null
  },

  async insert(lead: Lead): Promise<Lead> {
    if (useMemory()) return getMemoryStore().insertLead(lead)
    const existing = await LeadModel.findByHandle(lead.instagramHandle)
    if (existing) throw new Error(`Duplicate lead: ${lead.instagramHandle}`)
    const { data, error } = await supabase.from('leads').insert(leadToRow(lead)).select(LEAD_COLUMNS).single()
    if (error) throw new Error(error.message)
    return rowToLead(data as LeadRow)
  },

  async update(
    id: string,
    patch: Partial<Pick<Lead, 'pipelineState' | 'channelState' | 'nextAction' | 'nextActionAt' | 'lastContactedAt' | 'metaIgsid' | 'score' | 'displayName' | 'bio'>>,
  ): Promise<Lead> {
    const current = await LeadModel.findById(id)
    if (!current) throw new Error(`Lead not found: ${id}`)
    if (patch.pipelineState) {
      assertPipelineTransition(current.funnel, current.pipelineState, patch.pipelineState)
    }
    if (useMemory()) return getMemoryStore().updateLead(id, patch)
    const fields: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.pipelineState !== undefined) fields['pipeline_state'] = patch.pipelineState
    if (patch.channelState !== undefined) fields['channel_state'] = patch.channelState
    if (patch.nextAction !== undefined) fields['next_action'] = patch.nextAction
    if (patch.nextActionAt !== undefined) fields['next_action_at'] = patch.nextActionAt
    if (patch.lastContactedAt !== undefined) fields['last_contacted_at'] = patch.lastContactedAt
    if (patch.metaIgsid !== undefined) fields['meta_igsid'] = patch.metaIgsid
    if (patch.score !== undefined) fields['score'] = patch.score
    if (patch.displayName !== undefined) fields['display_name'] = patch.displayName
    if (patch.bio !== undefined) fields['bio'] = patch.bio
    const { data, error } = await supabase.from('leads').update(fields).eq('id', id).select(LEAD_COLUMNS).single()
    if (error) throw new Error(error.message)
    return rowToLead(data as LeadRow)
  },

  async transition(id: string, pipelineState: PipelineState, channelState?: ChannelState): Promise<Lead> {
    const patch: Parameters<typeof LeadModel.update>[1] = { pipelineState }
    if (channelState !== undefined) patch.channelState = channelState
    return LeadModel.update(id, patch)
  },

  async getOrCreateConversation(leadId: string): Promise<Conversation> {
    if (useMemory()) return getMemoryStore().getOrCreateConversation(leadId)
    const { data: existing, error: readError } = await supabase
      .from('conversations')
      .select('id, lead_id, channel_owner, messaging_window_expires_at, created_at, updated_at')
      .eq('lead_id', leadId)
      .maybeSingle()
    if (readError) throw new Error(readError.message)
    if (existing) return rowToConversation(existing as ConversationRow)
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        channel_owner: 'none',
        created_at: now,
        updated_at: now,
      })
      .select('id, lead_id, channel_owner, messaging_window_expires_at, created_at, updated_at')
      .single()
    if (error) throw new Error(error.message)
    return rowToConversation(data as ConversationRow)
  },

  async setConversationOwner(
    conversationId: string,
    channelOwner: Conversation['channelOwner'],
    messagingWindowExpiresAt?: string | null,
  ): Promise<Conversation> {
    if (useMemory()) {
      return getMemoryStore().updateConversation(conversationId, {
        channelOwner,
        ...(messagingWindowExpiresAt !== undefined ? { messagingWindowExpiresAt } : {}),
      })
    }
    const fields: Record<string, unknown> = {
      channel_owner: channelOwner,
      updated_at: new Date().toISOString(),
    }
    if (messagingWindowExpiresAt !== undefined) fields['messaging_window_expires_at'] = messagingWindowExpiresAt
    const { data, error } = await supabase
      .from('conversations')
      .update(fields)
      .eq('id', conversationId)
      .select('id, lead_id, channel_owner, messaging_window_expires_at, created_at, updated_at')
      .single()
    if (error) throw new Error(error.message)
    return rowToConversation(data as ConversationRow)
  },

  async addMessage(input: Omit<Message, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<Message> {
    const message: Message = {
      id: input.id ?? crypto.randomUUID(),
      conversationId: input.conversationId,
      leadId: input.leadId,
      direction: input.direction,
      source: input.source,
      body: input.body,
      variant: input.variant,
      jobId: input.jobId,
      externalId: input.externalId,
      createdAt: input.createdAt ?? new Date().toISOString(),
    }
    if (useMemory()) {
      if (message.externalId) {
        const dup = getMemoryStore().findMessageByExternalId(message.externalId)
        if (dup) return dup
      }
      return getMemoryStore().insertMessage(message)
    }
    if (message.externalId) {
      const { data: existing } = await supabase
        .from('messages')
        .select('id, conversation_id, lead_id, direction, source, body, variant, job_id, external_id, created_at')
        .eq('external_id', message.externalId)
        .maybeSingle()
      if (existing) return rowToMessage(existing as MessageRow)
    }
    const { data, error } = await supabase
      .from('messages')
      .insert({
        id: message.id,
        conversation_id: message.conversationId,
        lead_id: message.leadId,
        direction: message.direction,
        source: message.source,
        body: message.body,
        variant: message.variant,
        job_id: message.jobId,
        external_id: message.externalId,
        created_at: message.createdAt,
      })
      .select('id, conversation_id, lead_id, direction, source, body, variant, job_id, external_id, created_at')
      .single()
    if (error) throw new Error(error.message)
    return rowToMessage(data as MessageRow)
  },

  async findMessageByExternalId(externalId: string): Promise<Message | null> {
    if (useMemory()) return getMemoryStore().findMessageByExternalId(externalId)
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, lead_id, direction, source, body, variant, job_id, external_id, created_at')
      .eq('external_id', externalId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToMessage(data as MessageRow) : null
  },

  async listMessages(leadId: string): Promise<Message[]> {
    if (useMemory()) return getMemoryStore().listMessages(leadId)
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, lead_id, direction, source, body, variant, job_id, external_id, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return ((data ?? []) as MessageRow[]).map(rowToMessage)
  },

  async countBrowserDmsSince(sinceIso: string): Promise<number> {
    if (useMemory()) return getMemoryStore().countOutboundDmsSince(sinceIso)
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('direction', 'outbound')
      .eq('source', 'browser')
      .gte('created_at', sinceIso)
    if (error) throw new Error(error.message)
    return (data ?? []).length
  },

  async lastBrowserOutboundAt(): Promise<string | null> {
    if (useMemory()) return getMemoryStore().lastBrowserOutboundAt()
    const { data, error } = await supabase
      .from('messages')
      .select('created_at')
      .eq('direction', 'outbound')
      .eq('source', 'browser')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    const created = (data as { created_at?: string } | null)?.created_at
    return created ?? null
  },
}
