export type ClientPipelineState =
  | "discovered"
  | "qualified"
  | "contacted"
  | "replied"
  | "interested"
  | "whatsapp_handoff"
  | "registered"
  | "active_customer"
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

export type LeadRoleGuess = "store" | "employee" | "owner" | "decision_maker" | "unknown"

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
  lastContactedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  leadId: string
  channelOwner: "browser" | "api" | "none"
  messagingWindowExpiresAt: string | null
}

export interface Message {
  id: string
  conversationId: string
  leadId: string
  direction: "inbound" | "outbound"
  source: "browser" | "api" | "system"
  body: string
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

export type InboundScenario = "question" | "opt_in" | "opt_out" | "restriction"

export interface ExperimentSummary {
  id: string
  name: string
  hypothesis: string
  status: "draft" | "running" | "concluded"
  controlVariant: string
  variants: string[]
  sampleSize: number
  winner: string | null
  assignedCount: number
}

export interface JobSummary {
  id: string
  type: string
  status: string
  lastError: string | null
  createdAt: string
}

export interface BoardResponse {
  columns: Record<string, Lead[]>
  leads: Lead[]
  metrics: CrmMetrics
}

export interface LeadDetailResponse {
  lead: Lead
  messages: Message[]
  conversation: Conversation
}

export interface PublicCrmConfig {
  companyName: string
  ownerName: string
  instagramHandle: string
  whatsappLink: string
  oneLinePitch: string
  howItWorks: string[]
  revenueModel: string
  geography: string
  instagramLiveSend: boolean
}

export const CLIENT_PIPELINE_ORDER: ClientPipelineState[] = [
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
