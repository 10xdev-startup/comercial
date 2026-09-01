import { describe, it, expect } from '@jest/globals'
import { canChangeChannel, isChannelState, isTerminalChannel } from '@/domain/channel'

describe('channel', () => {
  it('keeps pipeline-independent channel states from the prompt', () => {
    expect(isChannelState('browser_contact_pending')).toBe(true)
    expect(isChannelState('waiting_inbound_reply')).toBe(true)
    expect(isChannelState('api_active')).toBe(true)
    expect(isTerminalChannel('do_not_contact')).toBe(true)
    expect(canChangeChannel('do_not_contact', 'api_active')).toBe(false)
    expect(canChangeChannel('browser_contact_pending', 'waiting_inbound_reply')).toBe(true)
  })
})
