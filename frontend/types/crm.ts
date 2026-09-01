export type Funnel = "customer" | "affiliate"

export type PipelineState =
  | "discovered"
  | "qualified"
  | "contacted"
  | "replied"
  | "interested"
  | "whatsapp_handoff"
  | "registered"
  | "active_customer"
  | "joined_affiliate_group"
  | "active_affiliate"
  | "generated_customer"
  | "closed"

export type ChannelState =
  | "browser_contact_pending"
  | "browser_contact_sent"
  | "waiting_inbound_reply"
  | "api_eligible"
  | "api_active"
  | "api_window_closed"
  | "human_review_required"
  | "do_not_contact"
  | "blocked"
  | "completed"

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
  roleGuess: string
  nextAction: string | null
  nextActionAt: string | null
  lastContactedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  leadId: string
  direction: "inbound" | "outbound"
  source: "browser" | "api" | "system"
  body: string
  variant: string | null
  createdAt: string
}

export interface Conversation {
  id: string
  leadId: string
  channelOwner: "browser" | "api" | "none"
  messagingWindowExpiresAt: string | null
}

export interface CrmMetrics {
  leadCount: number
  activeCustomerCount: number
  monthlySpendUsd: number
  monthlyBudgetUsd: number
  costPerLeadUsd: number | null
  costPerActiveCustomerUsd: number | null
}

export interface SystemState {
  paused: boolean
  pauseReason: string | null
  updatedAt: string
}

export interface JobSummary {
  id: string
  type: string
  status: string
  runAt: string
  attempts: number
  lastError: string | null
}

export interface BoardResponse {
  funnel: Funnel
  columns: Record<string, Lead[]>
  leads: Lead[]
}

export interface LeadDetailResponse {
  lead: Lead
  messages: Message[]
  conversation: Conversation
}

export const CUSTOMER_COLUMNS: PipelineState[] = [
  "discovered",
  "qualified",
  "contacted",
  "replied",
  "interested",
  "whatsapp_handoff",
  "registered",
  "active_customer",
  "closed",
]

export const AFFILIATE_COLUMNS: PipelineState[] = [
  "discovered",
  "qualified",
  "contacted",
  "replied",
  "interested",
  "joined_affiliate_group",
  "active_affiliate",
  "generated_customer",
  "closed",
]
