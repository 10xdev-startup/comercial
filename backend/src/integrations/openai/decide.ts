import { estimateCostUsd } from '@/domain/budget'
import { AiUsageModel } from '@/models/SystemStateModel'

export type ConversationIntent =
  | 'interested'
  | 'asked_info'
  | 'asked_pricing'
  | 'wants_whatsapp'
  | 'not_the_owner'
  | 'will_forward'
  | 'objection'
  | 'not_interested'
  | 'opt_out'
  | 'ambiguous'
  | 'needs_human'

export type ConversationAction =
  | 'reply'
  | 'ask'
  | 'present'
  | 'handle_objection'
  | 'handoff_whatsapp'
  | 'wait'
  | 'schedule_follow_up'
  | 'close'
  | 'escalate'

export interface ConversationDecision {
  intent: ConversationIntent
  action: ConversationAction
  skipped: boolean
  model: string
}

const OPT_OUT_RE = /\b(pare|parar|stop|não quero|nao quero|opt[- ]?out)\b/i

/**
 * Without OPENAI_API_KEY this never calls the network. Opt-out is still honored.
 */
export async function decideOnInbound(text: string, leadId: string | null): Promise<ConversationDecision> {
  if (OPT_OUT_RE.test(text)) {
    return { intent: 'opt_out', action: 'close', skipped: true, model: 'stub' }
  }
  const apiKey = process.env['OPENAI_API_KEY']
  if (!apiKey) {
    await AiUsageModel.record({
      model: 'stub',
      purpose: 'inbound_decision',
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: estimateCostUsd('stub', 0, 0),
      leadId,
    })
    return { intent: 'needs_human', action: 'escalate', skipped: true, model: 'stub' }
  }
  return { intent: 'ambiguous', action: 'escalate', skipped: true, model: process.env['OPENAI_MODEL'] ?? 'gpt-4.1' }
}
