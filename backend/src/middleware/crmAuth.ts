import type { Request, Response, NextFunction } from 'express'
import { isDatabaseConfigured } from '@/database/isConfigured'
import { supabaseMiddleware } from '@/middleware/supabaseMiddleware'
import type { AuthUser } from '@/types/user'

const DEV_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@local',
  name: 'Operador local',
  role: 'user',
  status: 'active',
  avatarUrl: null,
}

/**
 * CRM routes need a user. With Supabase configured this is real JWT auth.
 * Without credentials the HTTP API still serves the in-memory store so the
 * dashboard boots in cloud/CI.
 */
export async function crmAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isDatabaseConfigured()) {
    req.user = DEV_USER
    next()
    return
  }
  await supabaseMiddleware(req, res, next)
}
