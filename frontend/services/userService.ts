import { apiClient } from "@/services/apiClient"
import type { User } from "@/types/user"

/**
 * Service do dominio `user` (blueprint §1) — fino, 1 linha por metodo, consome o
 * `apiClient` que ja desembrulha o envelope wrapped (recebe `User`, sem `.data` nem
 * cast). Use como molde para cada novo dominio (`<dominio>Service.ts`).
 */
export const userService = {
  /** Perfil do usuario autenticado (GET /users/me). */
  getMe: () => apiClient.get<User>("/users/me"),
  /** Marca o onboarding como concluido (POST /users/onboard). */
  onboard: () => apiClient.post<User>("/users/onboard"),
  /** Atualiza nome/avatar do proprio usuario (PATCH /users/me). */
  updateMe: (input: { name?: string | null; avatarUrl?: string | null }) =>
    apiClient.patch<User>("/users/me", input),
}
