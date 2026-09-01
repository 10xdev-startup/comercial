export type Funnel = 'customer' | 'affiliate'

export type CustomerPipelineState =
  | 'discovered'
  | 'qualified'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'whatsapp_handoff'
  | 'registered'
  | 'active_customer'
  | 'closed'

export type AffiliatePipelineState =
  | 'discovered'
  | 'qualified'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'joined_affiliate_group'
  | 'active_affiliate'
  | 'generated_customer'
  | 'closed'

export type PipelineState = CustomerPipelineState | AffiliatePipelineState

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
  funnel: Funnel
  pipelineState: PipelineState
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
  metaIgsid: string | null
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

export interface Campaign {
  id: string
  name: string
  funnel: Funnel
  status: 'draft' | 'active' | 'paused' | 'archived'
  experimentId: string | null
  createdAt: string
  updatedAt: string
}

export interface Experiment {
  id: string
  name: string
  hypothesis: string
  status: 'draft' | 'running' | 'concluded'
  controlVariant: string
  variants: string[]
  sampleSize: number
  winner: string | null
  createdAt: string
  updatedAt: string
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
  monthlySpendUsd: number
  monthlyBudgetUsd: number
  costPerLeadUsd: number | null
  costPerActiveCustomerUsd: number | null
}

export const CUSTOMER_PIPELINE_ORDER: CustomerPipelineState[] = [
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

export const AFFILIATE_PIPELINE_ORDER: AffiliatePipelineState[] = [
  'discovered',
  'qualified',
  'contacted',
  'replied',
  'interested',
  'joined_affiliate_group',
  'active_affiliate',
  'generated_customer',
  'closed',
]
