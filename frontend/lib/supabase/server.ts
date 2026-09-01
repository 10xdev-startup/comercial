import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Client de servidor do Supabase — lê/escreve cookies via `next/headers` para o gate
 * de rotas (proxy) e Server Components conseguirem ler a sessão (blueprint §3.2).
 */
export async function createClient(): Promise<ReturnType<typeof createServerClient>> {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios",
    )
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components não gravam cookies; o proxy atualiza a sessão.
        }
      },
    },
  })
}
