import type { Request, Response, NextFunction } from 'express'
import { sendError } from '@/utils/apiResponse'
import type { UserRole } from '@/types/user'

/**
 * Guard de papel global. Exige que `req.user` (injetado pelo `supabaseMiddleware`)
 * tenha um dos papeis informados. Use DEPOIS do `supabaseMiddleware` na cadeia.
 *
 * Ex.: `router.get('/admin/stats', requireAdmin, AdminController.stats)`
 *      `router.patch('/posts/:id', requireRole('admin', 'editor'), ctrl.update)`
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'Nao autenticado', 'AUTH_REQUIRED')
      return
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, 403, 'Acesso negado', 'FORBIDDEN')
      return
    }
    next()
  }
}

/** Atalho para `requireRole('admin')`. */
export const requireAdmin = requireRole('admin')
