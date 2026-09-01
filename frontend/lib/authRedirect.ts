// Destino pós-login. Só aceita path relativo do próprio app — qualquer outra coisa
// cai no fallback, senão vira open redirect.
// As rotas do próprio fluxo de entrada também são rejeitadas: mandar o usuário de
// volta pro login, pro cadastro ou pra tela de boas-vindas o devolveria ao começo.

const FALLBACK = "/inicio"

// Host fixo só pra resolver o path: se o valor escapar dele, não era relativo.
const BASE = "https://redirect.invalid"

export function normalizeRedirectTarget(raw: string | string[] | null | undefined): string {
  if (typeof raw !== "string") return FALLBACK
  // Sem isto, 'evil.com' resolveria pra BASE/evil.com e passaria como se fosse interno.
  if (!raw.startsWith("/")) return FALLBACK

  let url: URL
  try {
    url = new URL(raw, BASE)
  } catch {
    return FALLBACK
  }

  // Resolver com o parser de URL é o que fecha os bypasses: '//evil.com',
  // '/\evil.com' (o parser normaliza a barra invertida) e '/<tab>/evil.com' (o
  // parser remove o caractere de controle) todos acabam com outra origem. É a mesma
  // normalização que o browser faria ao seguir o Location.
  if (url.origin !== BASE) return FALLBACK

  const path = `${url.pathname}${url.search}`

  if (path === "/login" || path.startsWith("/login?")) return FALLBACK
  if (path === "/cadastro" || path.startsWith("/cadastro?")) return FALLBACK
  if (path === "/seja-bem-vindo" || path.startsWith("/seja-bem-vindo?")) return FALLBACK

  return path
}

// Destino de primeiro acesso. O deep link viaja no ?next= porque
// normalizeRedirectTarget rejeita /seja-bem-vindo — passá-la como destino
// devolveria o usuário pra ela depois da CTA.
export function welcomeHref(destination: string): string {
  if (destination === FALLBACK) return "/seja-bem-vindo"
  return `/seja-bem-vindo?next=${encodeURIComponent(destination)}`
}
