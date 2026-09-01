import { describe, it, expect } from '@jest/globals'
import { logEvent } from '@/observability/logger'

describe('structured logger', () => {
  it('redacts secrets and tokens', () => {
    const lines: string[] = []
    const original = console.info
    console.info = ((value: unknown) => {
      lines.push(String(value))
    }) as typeof console.info
    try {
      logEvent('test_event', {
        token: 'abc',
        OPENAI_API_KEY: 'sk-secret-value',
        nested: { authorization: 'Bearer xyz', ok: true },
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
      })
    } finally {
      console.info = original
    }
    const payload = lines[0] ?? ''
    expect(payload).toContain('"event":"test_event"')
    expect(payload).not.toContain('sk-secret-value')
    expect(payload).not.toContain('Bearer xyz')
    expect(payload).toContain('[redacted]')
    expect(payload).toContain('[redacted-jwt]')
  })
})
