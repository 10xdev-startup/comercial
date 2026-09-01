import { describe, it, expect } from '@jest/globals'
import { canSendViaApi, canSendViaBrowser, channelAfterBrowserSend, channelAfterInboundReply } from '@/domain/channel'

describe('channel lock', () => {
  it('lets the browser send only before handoff', () => {
    expect(canSendViaBrowser('browser_contact_pending')).toBe(true)
    expect(canSendViaBrowser('waiting_inbound_reply')).toBe(false)
    expect(canSendViaBrowser('api_active')).toBe(false)
  })

  it('lets the API send only after inbound handoff', () => {
    expect(canSendViaApi('waiting_inbound_reply')).toBe(false)
    expect(canSendViaApi('api_active')).toBe(true)
  })

  it('moves to waiting_inbound_reply after a browser send', () => {
    expect(channelAfterBrowserSend('browser_contact_pending')).toBe('waiting_inbound_reply')
    expect(() => channelAfterBrowserSend('api_active')).toThrow(/Channel lock/)
  })

  it('hands off to api_active on inbound reply', () => {
    expect(channelAfterInboundReply('waiting_inbound_reply')).toBe('api_active')
    expect(() => channelAfterInboundReply('do_not_contact')).toThrow(/Channel lock/)
  })
})
