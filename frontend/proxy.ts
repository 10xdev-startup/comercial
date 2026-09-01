import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { normalizeRedirectTarget } from "@/lib/authRedirect"
import { isSupabaseConfigured } from "@/lib/supabaseConfigured"

/**
 * Atualiza os cookies da sessao e aplica o gate de rotas do produto.
 *
 * Aberto a visitante: a landing, as LPs e as duas telas de entrada. Todo o resto
 * (o grupo `(dashboard)` e a tela de boas-vindas) exige sessao valida.
 */
const PUBLIC_PATHS = ["/", "/login", "/cadastro"]
const PUBLIC_PREFIXES = ["/lp/"]

// Rotas de entrada: quem ja tem sessao e resolvido no destino, nao ve o formulario.
const ENTRY_PATHS = ["/login", "/cadastro"]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// O redirect precisa carregar os cookies que o refresh acabou de escrever, senao a
// sessao renovada se perde e a proxima request recomeca o ciclo.
function redirectPreservingCookies(destination: URL, source: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(destination)
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Sem isto o gate redireciona tudo pro /login e ninguem entra em lugar nenhum
  // (nem cadastro funciona, porque o projeto Supabase nao existe de verdade).
  if (!url || !key || !isSupabaseConfigured()) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = data?.claims != null

  const { pathname, search } = request.nextUrl

  if (!isAuthenticated && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", `${pathname}${search}`)
    return redirectPreservingCookies(loginUrl, response)
  }

  if (isAuthenticated && ENTRY_PATHS.includes(pathname)) {
    const destination = normalizeRedirectTarget(request.nextUrl.searchParams.get("redirect"))
    return redirectPreservingCookies(new URL(destination, request.url), response)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
