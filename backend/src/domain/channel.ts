import type { ChannelState } from '@/types/crm'

/** Browser may open a thread only before the official API owns it. */
export function canSendViaBrowser(state: ChannelState): boolean {
  return state === 'browser_contact_pending' || state === 'browser_contact_sent'
}

/** Official API replies only after inbound handoff. */
export function canSendViaApi(state: ChannelState): boolean {
  return state === 'api_eligible' || state === 'api_active'
}

export function channelAfterBrowserSend(state: ChannelState): ChannelState {
  if (!canSendViaBrowser(state)) {
    throw new Error(`Channel lock: browser cannot send from ${state}`)
  }
  return 'waiting_inbound_reply'
}

export function channelAfterInboundReply(state: ChannelState): ChannelState {
  if (state === 'do_not_contact' || state === 'blocked') {
    throw new Error(`Channel lock: cannot hand off from ${state}`)
  }
  if (state === 'api_active' || state === 'api_eligible') return 'api_active'
  if (
    state === 'waiting_inbound_reply' ||
    state === 'browser_contact_sent' ||
    state === 'browser_contact_pending'
  ) {
    return 'api_active'
  }
  if (state === 'api_window_closed') return 'human_review_required'
  return 'api_active'
}

export function isTerminalChannel(state: ChannelState): boolean {
  return state === 'do_not_contact' || state === 'blocked' || state === 'completed'
}
