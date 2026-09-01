export type ClientPipelineState =
  | 'discovered'
  | 'qualified'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'whatsapp_handoff'
  | 'registered'
  | 'active_customer'
  | 'closed'

export type ChannelState =
  | 'browser_contact_pending'
  | 'browser_contact_sent'
  | 'waiting_inbound_reply'
  | 'api_eligible'
  | 'api_active'
  | 'api_window_closed'
  | 'human_review_required'
  | 'do_not_contact'
  | 'blocked'
  | 'completed'

export type LeadRoleGuess = 'store' | 'employee' | 'owner' | 'decision_maker' | 'unknown'

export type MessageDirection = 'inbound' | 'outbound'
export type MessageSource = 'browser' | 'api' | 'system'

export interface Lead {
  id: string
  instagramHandle: string
  displayName: string | null
  bio: string | null
  pipelineState: ClientPipelineState
  channelState: ChannelState
  score: number
  niche: string | null
  tags: string[]
  origin: string | null
  roleGuess: LeadRoleGuess
  nextAction: string | null
  nextActionAt: string | null
  campaignId: string | null
  experimentId: string | null
  experimentVariant: string | null
  lastContactedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  leadId: string
  channelOwner: 'browser' | 'api' | 'none'
  messagingWindowExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  leadId: string
  direction: MessageDirection
  source: MessageSource
  body: string
  variant: string | null
  jobId: string | null
  externalId: string | null
  createdAt: string
}

export interface DoNotContactEntry {
  id: string
  instagramHandle: string
  reason: string
  source: string
  createdAt: string
}

export interface AiUsageEntry {
  id: string
  model: string
  purpose: string
  promptTokens: number
  completionTokens: number
  estimatedCostUsd: number
  leadId: string | null
  createdAt: string
}

export interface SystemState {
  paused: boolean
  pauseReason: string | null
  updatedAt: string
}

export interface CrmMetrics {
  leadCount: number
  activeCustomerCount: number
  aiCostUsdThisMonth: number
  aiCostPerLead: number
}

export const CLIENT_PIPELINE_ORDER: ClientPipelineState[] = [
  'discovered',
  'qualified',
  'contacted',
  'replied',
  'interested',
  'whatsapp_handoff',
  'registered',
  'active_customer',
  'closed',
]

export const CHANNEL_STATES: ChannelState[] = [
  'browser_contact_pending',
  'browser_contact_sent',
  'waiting_inbound_reply',
  'api_eligible',
  'api_active',
  'api_window_closed',
  'human_review_required',
  'do_not_contact',
  'blocked',
  'completed',
]
