import { describe, it, expect } from '@jest/globals'
import { verifyMetaSignature, extractInboundMessages } from '@/integrations/instagram/signature'
import crypto from 'crypto'

describe('Meta webhook signature', () => {
  it('accepts a valid sha256 HMAC', () => {
    const body = Buffer.from('{"object":"instagram"}')
    const secret = 'test-secret'
    const digest = crypto.createHmac('sha256', secret).update(body).digest('hex')
    expect(verifyMetaSignature(body, `sha256=${digest}`, secret)).toBe(true)
  })

  it('rejects a bad signature when a secret is configured', () => {
    expect(verifyMetaSignature(Buffer.from('x'), 'sha256=deadbeef', 'secret')).toBe(false)
    expect(verifyMetaSignature(Buffer.from('x'), undefined, 'secret')).toBe(false)
  })

  it('sketches verification as pass-through when no app secret is set', () => {
    expect(verifyMetaSignature(Buffer.from('x'), undefined, '')).toBe(true)
  })
})

describe('extractInboundMessages', () => {
  it('reads Messenger-style entry.messaging', () => {
    const events = extractInboundMessages({
      entry: [{ messaging: [{ sender: { id: 'igsid-1' }, message: { mid: 'mid-1', text: 'oi' } }] }],
    })
    expect(events).toEqual([{ externalId: 'mid-1', igsid: 'igsid-1', handle: null, text: 'oi' }])
  })
})
