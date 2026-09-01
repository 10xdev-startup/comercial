export const CONVERSATION_INTENTS = [
  'interested',
  'asked_info',
  'asked_pricing',
  'wants_whatsapp',
  'not_the_owner',
  'will_forward',
  'objection',
  'not_interested',
  'opt_out',
  'ambiguous',
  'needs_human',
] as const

export type ConversationIntent = (typeof CONVERSATION_INTENTS)[number]

export const CONVERSATION_ACTIONS = [
  'reply',
  'ask',
  'present',
  'handle_objection',
  'handoff_whatsapp',
  'wait',
  'schedule_follow_up',
  'close',
  'escalate_human',
] as const

export type ConversationAction = (typeof CONVERSATION_ACTIONS)[number]

export function isConversationIntent(value: unknown): value is ConversationIntent {
  return typeof value === 'string' && (CONVERSATION_INTENTS as readonly string[]).includes(value)
}

export function isConversationAction(value: unknown): value is ConversationAction {
  return typeof value === 'string' && (CONVERSATION_ACTIONS as readonly string[]).includes(value)
}
