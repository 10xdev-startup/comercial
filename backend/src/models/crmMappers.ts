import type { ChannelState, ClientPipelineState, Conversation, Lead, LeadRoleGuess, Message, SystemState } from '@/types/crm'
import type { Job, JobPayload, JobStatus, JobType } from '@/types/job'

export interface LeadRow {
  id: string
  instagram_handle: string
  display_name: string | null
  bio: string | null
  pipeline_state: ClientPipelineState
  channel_state: ChannelState
  score: number
  niche: string | null
  tags: string[]
  origin: string | null
  role_guess: LeadRoleGuess
  next_action: string | null
  next_action_at: string | null
  campaign_id: string | null
  experiment_id: string | null
  experiment_variant: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

export interface ConversationRow {
  id: string
  lead_id: string
  channel_owner: 'browser' | 'api' | 'none'
  messaging_window_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface MessageRow {
  id: string
  conversation_id: string
  lead_id: string
  direction: 'inbound' | 'outbound'
  source: 'browser' | 'api' | 'system'
  body: string
  variant: string | null
  job_id: string | null
  external_id: string | null
  created_at: string
}

export interface JobRow {
  id: string
  type: JobType
  payload: JobPayload
  status: JobStatus
  run_at: string
  attempts: number
  max_attempts: number
  last_error: string | null
  claimed_at: string | null
  locked_by: string | null
  idempotency_key: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export interface SystemStateRow {
  id: number
  paused: boolean
  pause_reason: string | null
  updated_at: string
}

export function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    instagramHandle: row.instagram_handle,
    displayName: row.display_name,
    bio: row.bio,
    pipelineState: row.pipeline_state,
    channelState: row.channel_state,
    score: row.score,
    niche: row.niche,
    tags: row.tags,
    origin: row.origin,
    roleGuess: row.role_guess,
    nextAction: row.next_action,
    nextActionAt: row.next_action_at,
    campaignId: row.campaign_id,
    experimentId: row.experiment_id,
    experimentVariant: row.experiment_variant,
    lastContactedAt: row.last_contacted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    leadId: row.lead_id,
    channelOwner: row.channel_owner,
    messagingWindowExpiresAt: row.messaging_window_expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    leadId: row.lead_id,
    direction: row.direction,
    source: row.source,
    body: row.body,
    variant: row.variant,
    jobId: row.job_id,
    externalId: row.external_id,
    createdAt: row.created_at,
  }
}

export function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    type: row.type,
    payload: row.payload ?? {},
    status: row.status,
    runAt: row.run_at,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    lastError: row.last_error,
    claimedAt: row.claimed_at,
    lockedBy: row.locked_by,
    idempotencyKey: row.idempotency_key,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToSystemState(row: SystemStateRow): SystemState {
  return {
    paused: row.paused,
    pauseReason: row.pause_reason,
    updatedAt: row.updated_at,
  }
}
