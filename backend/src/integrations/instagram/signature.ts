import crypto from 'crypto'

export function verifyMetaSignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!appSecret) return true
  if (!signatureHeader) return false
  const prefix = 'sha256='
  if (!signatureHeader.startsWith(prefix)) return false
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const provided = signatureHeader.slice(prefix.length)
  const expectedBuf = Buffer.from(expected, 'hex')
  const providedBuf = Buffer.from(provided, 'hex')
  if (expectedBuf.length !== providedBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, providedBuf)
}

export interface InstagramInboundMessage {
  externalId: string
  igsid: string
  handle: string | null
  text: string
}

interface MessagingEvent {
  sender?: { id?: string }
  message?: { mid?: string; text?: string }
}

interface ChangeValue {
  sender?: { id?: string }
  messages?: Array<{ id?: string; text?: string; from?: { username?: string } }>
  messaging?: MessagingEvent[]
}

/**
 * Extracts inbound text events from a Meta Instagram webhook payload.
 * Supports both Messenger-style `entry[].messaging` and IG `entry[].changes`.
 */
export function extractInboundMessages(payload: unknown): InstagramInboundMessage[] {
  if (!payload || typeof payload !== 'object') return []
  const entry = (payload as { entry?: unknown }).entry
  if (!Array.isArray(entry)) return []
  const out: InstagramInboundMessage[] = []
  for (const item of entry) {
    if (!item || typeof item !== 'object') continue
    const record = item as { messaging?: MessagingEvent[]; changes?: Array<{ value?: ChangeValue }> }
    if (Array.isArray(record.messaging)) {
      for (const event of record.messaging) {
        const text = event.message?.text
        const mid = event.message?.mid
        const igsid = event.sender?.id
        if (text && mid && igsid) {
          out.push({ externalId: mid, igsid, handle: null, text })
        }
      }
    }
    if (Array.isArray(record.changes)) {
      for (const change of record.changes) {
        const value = change.value
        const messages = value?.messages
        if (!Array.isArray(messages)) continue
        for (const message of messages) {
          const text = message.text
          const id = message.id
          const igsid = value?.sender?.id ?? id
          if (text && id && igsid) {
            const handle = message.from?.username ?? null
            out.push({ externalId: id, igsid, handle, text })
          }
        }
      }
    }
  }
  return out
}
