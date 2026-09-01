import type { ChannelState } from '@/types/crm'
import { CHANNEL_STATES } from '@/types/crm'

export function isChannelState(value: unknown): value is ChannelState {
  return typeof value === 'string' && (CHANNEL_STATES as string[]).includes(value)
}

export function isTerminalChannel(state: ChannelState): boolean {
  return state === 'do_not_contact' || state === 'blocked' || state === 'completed'
}

export function canChangeChannel(from: ChannelState, to: ChannelState): boolean {
  if (from === to) return true
  if (from === 'do_not_contact') return false
  return isChannelState(to)
}
