// Valor de fabrica em frontend/.env.example — `cp .env.example .env` copia isto
// verbatim, entao "URL presente" nao quer dizer "Supabase configurado de verdade".
const PLACEHOLDER_SUPABASE_URL = "https://seu-projeto.supabase.co"

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(url && key && url !== PLACEHOLDER_SUPABASE_URL)
}
