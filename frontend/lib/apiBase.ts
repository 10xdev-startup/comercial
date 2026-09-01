const LOCAL_API_URL = "http://localhost:3001"

/**
 * Regra de ouro (blueprint §3.1): host vence env. Em localhost o browser SEMPRE
 * fala com o backend local, antes de checar a env var da URL da API — evita o dev
 * bater na prod sem querer e mascarar mudanças locais.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname
    if (host === "localhost" || host === "127.0.0.1") {
      return LOCAL_API_URL
    }
  }
  return process.env.NEXT_PUBLIC_API_URL ?? LOCAL_API_URL
}
