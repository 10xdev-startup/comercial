const SECRET_KEY = /secret|token|password|authorization|apikey|api_key|cookie|private/i

function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('sk-') || value.startsWith('sbp_') || value.startsWith('sb_secret')) return '[redacted]'
    if (value.length > 24 && /eyJ[A-Za-z0-9_-]+\./.test(value)) return '[redacted-jwt]'
    return value
  }
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEY.test(key) ? '[redacted]' : redact(item)
    }
    return out
  }
  return value
}

export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  const safe = redact(fields) as Record<string, unknown>
  console.info(JSON.stringify({ ts: new Date().toISOString(), event, ...safe }))
}
