import { createHmac, timingSafeEqual } from 'crypto'
import { logEvent } from '@/observability/logger'

export interface InboundInstagramMessage {
  kind: 'message'
  mid: string
  text: string
  senderId: string
  username: string | null
}

export interface InboundRestrictionEvent {
  kind: 'restriction'
  senderId: string
  detail: string
}

export type InboundEvent = InboundInstagramMessage | InboundRestrictionEvent

function envText(name: string): string | null {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return null
  return raw.trim()
}

export function getWebhookVerifyToken(): string | null {
  return envText('INSTAGRAM_WEBHOOK_VERIFY_TOKEN')
}

export function getAppSecret(): string | null {
  return envText('INSTAGRAM_APP_SECRET')
}

export function verifyWebhookChallenge(query: {
  mode?: string
  token?: string
  challenge?: string
}): string | null {
  const expected = getWebhookVerifyToken()
  if (!expected) {
    logEvent('webhook_verify_stub', { reason: 'missing_verify_token' })
    return query.challenge ?? null
  }
  if (query.mode !== 'subscribe' || query.token !== expected || !query.challenge) return null
  return query.challenge
}

export function verifySignature(rawBody: Buffer, header: string | undefined): boolean {
  const secret = getAppSecret()
  if (!secret) {
    logEvent('webhook_signature_stub', { reason: 'missing_app_secret' })
    return true
  }
  if (!header || !header.startsWith('sha256=')) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const provided = header.slice('sha256='.length)
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(provided, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isRestrictionField(field: string | null, value: Record<string, unknown> | null): boolean {
  if (field === 'restriction' || field === 'account_restriction') return true
  if (!value) return false
  const eventType = readText(value['event_type']) ?? readText(value['type'])
  return eventType === 'restriction' || value['restriction'] === true || value['policy_enforcement'] != null
}

export function parseInboundEvents(payload: unknown): InboundEvent[] {
  const root = asRecord(payload)
  if (!root) return []
  const found: InboundEvent[] = []
  if (root['restriction'] === true) {
    found.push({
      kind: 'restriction',
      senderId: readText(root['senderId']) ?? 'unknown',
      detail: readText(root['detail']) ?? 'restriction',
    })
  }
  const entries = Array.isArray(root['entry']) ? root['entry'] : []
  for (const entry of entries) {
    const row = asRecord(entry)
    if (!row) continue
    const messaging = Array.isArray(row['messaging']) ? row['messaging'] : []
    for (const item of messaging) {
      const msg = asRecord(item)
      if (!msg) continue
      const sender = asRecord(msg['sender'])
      const message = asRecord(msg['message'])
      const senderId = readText(sender?.['id']) ?? 'unknown'
      if (msg['policy_enforcement'] != null || isRestrictionField(null, msg)) {
        found.push({ kind: 'restriction', senderId, detail: 'policy_enforcement' })
        continue
      }
      const username = readText(sender?.['username']) ?? readText(message?.['from']) ?? null
      const mid = readText(message?.['mid'])
      const text = readText(message?.['text'])
      if (mid && text) {
        found.push({ kind: 'message', mid, text, senderId, username })
      }
    }
    const changes = Array.isArray(row['changes']) ? row['changes'] : []
    for (const change of changes) {
      const ch = asRecord(change)
      const field = readText(ch?.['field'])
      const value = asRecord(ch?.['value'])
      if (!value) continue
      const from = asRecord(value['from'])
      const senderId = readText(from?.['id']) ?? readText(value['sender_id']) ?? 'unknown'
      if (isRestrictionField(field, value)) {
        found.push({
          kind: 'restriction',
          senderId,
          detail: readText(value['text']) ?? readText(value['message']) ?? 'restriction',
        })
        continue
      }
      const username = readText(from?.['username']) ?? null
      const mid = readText(value['mid'])
      const text = readText(value['text'])
      if (mid && text) {
        found.push({ kind: 'message', mid, text, senderId, username })
      }
    }
  }
  return found
}
