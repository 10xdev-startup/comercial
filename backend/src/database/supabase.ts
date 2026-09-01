import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Carga da env fica so em src/index.ts (unico ponto, com override: true). Sem
// dotenv.config() aqui: o client abaixo e lazy (Proxy), entao process.env so e lido
// no primeiro uso real do banco — bem depois do index.ts ja ter carregado o .env.
let client: SupabaseClient | null = null

// Cria o client sob demanda. As credenciais so sao exigidas no primeiro uso
// real do banco — nao no boot do processo.
function getClient(): SupabaseClient {
  if (client) return client
  const supabaseUrl = process.env['SUPABASE_URL']
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios')
  }
  client = createClient(supabaseUrl, supabaseKey)
  return client
}

// Proxy lazy: o client real so e inicializado (e as credenciais cobradas) no
// primeiro acesso a uma propriedade, ex. `supabase.from(...)` ou `supabase.auth`.
// Assim o backend sobe sem Supabase configurado (ex.: apenas /health) e so falha
// se uma rota que de fato usa o banco for chamada.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getClient()
    const value = Reflect.get(c, prop, c)
    return typeof value === 'function' ? value.bind(c) : value
  },
})
