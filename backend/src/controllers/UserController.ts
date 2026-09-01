import type { Request, Response } from 'express'
import { UserModel } from '@/models/UserModel'
import { AppError } from '@/utils/AppError'
import { sendOk } from '@/utils/apiResponse'
import { rowToUser } from '@/types/user'

/**
 * Controller do dominio `user` (Controller → Model → Database). Lê `req.user`
 * (injetado pelo supabaseMiddleware), delega ao Model e responde via `sendOk`.
 * Erros esperados sao lancados como `AppError` — o `errorHandler` central serializa.
 */
export const UserController = {
  /** GET /users/me — perfil do usuario autenticado. */
  async me(req: Request, res: Response): Promise<void> {
    const auth = req.user
    if (!auth) throw new AppError(401, 'Nao autenticado', 'AUTH_REQUIRED')

    const row = await UserModel.findById(auth.id)
    if (!row) throw new AppError(404, 'Usuario nao encontrado', 'USER_NOT_FOUND')

    sendOk(res, rowToUser(row))
  },

  /** POST /users/onboard — marca o onboarding como concluido. */
  async onboard(req: Request, res: Response): Promise<void> {
    const auth = req.user
    if (!auth) throw new AppError(401, 'Nao autenticado', 'AUTH_REQUIRED')

    const row = await UserModel.markOnboarded(auth.id)
    sendOk(res, rowToUser(row))
  },

  /** PATCH /users/me — atualiza nome/avatar do proprio usuario. */
  async updateMe(req: Request, res: Response): Promise<void> {
    const auth = req.user
    if (!auth) throw new AppError(401, 'Nao autenticado', 'AUTH_REQUIRED')

    const body = (req.body ?? {}) as { name?: unknown; avatarUrl?: unknown }
    const patch: { name?: string | null; avatarUrl?: string | null } = {}

    if (body.name !== undefined) {
      if (body.name !== null && typeof body.name !== 'string') {
        throw new AppError(422, 'name deve ser string ou null', 'INVALID_NAME')
      }
      patch.name = body.name
    }
    if (body.avatarUrl !== undefined) {
      if (body.avatarUrl !== null && typeof body.avatarUrl !== 'string') {
        throw new AppError(422, 'avatarUrl deve ser string ou null', 'INVALID_AVATAR')
      }
      patch.avatarUrl = body.avatarUrl
    }

    const row = await UserModel.update(auth.id, patch)
    sendOk(res, rowToUser(row))
  },
}
