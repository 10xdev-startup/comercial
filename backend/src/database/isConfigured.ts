function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true
  const trimmed = value.trim()
  if (!trimmed) return true
  if (trimmed.includes('sua-') || trimmed.includes('aqui')) return true
  if (trimmed.includes('seu-projeto') || trimmed.includes('seu-token')) return true
  return false
}

/** True when the backend can talk to Supabase (real service-role, not .env.example). */
export function isDatabaseConfigured(): boolean {
  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  return !isPlaceholder(url) && !isPlaceholder(key)
}
