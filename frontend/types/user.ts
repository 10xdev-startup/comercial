/** Papel global do usuario (espelha o backend). Edite a union para adicionar papeis. */
export type UserRole = "user" | "admin"

/**
 * Modelo de dados COMPARTILHADO (blueprint §2) — espelha o `User` da API (camelCase),
 * consumido por services + componentes. Vive em `types/`, nao dentro de um service.
 */
export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: UserRole
  onboardedAt: string | null
  createdAt: string
}
