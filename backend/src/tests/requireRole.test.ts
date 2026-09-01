import { describe, it, expect } from '@jest/globals'
import type { Request, Response } from 'express'
import { requireRole, requireAdmin } from '@/middleware/requireRole'
import type { AuthUser } from '@/types/user'

/** Mock minimo do `Response` do Express: captura status e body enviados. */
function createMockRes() {
  const calls = { status: 0, body: undefined as unknown }
  const res = {
    status(code: number) {
      calls.status = code
      return res
    },
    json(body: unknown) {
      calls.body = body
      return res
    },
  }
  return { res: res as unknown as Response, calls }
}

function reqWith(user?: AuthUser): Request {
  return { user } as unknown as Request
}

const admin: AuthUser = {
  id: '1', email: 'a@x.com', name: null, role: 'admin', status: 'active', avatarUrl: null,
}
const member: AuthUser = {
  id: '2', email: 'u@x.com', name: null, role: 'user', status: 'active', avatarUrl: null,
}

describe('requireRole', () => {
  it('chama next() quando o papel bate', () => {
    const { res, calls } = createMockRes()
    let nexted = false
    requireAdmin(reqWith(admin), res, () => {
      nexted = true
    })
    expect(nexted).toBe(true)
    expect(calls.status).toBe(0)
  })

  it('responde 403 (envelope wrapped) quando o papel nao bate', () => {
    const { res, calls } = createMockRes()
    let nexted = false
    requireAdmin(reqWith(member), res, () => {
      nexted = true
    })
    expect(nexted).toBe(false)
    expect(calls.status).toBe(403)
    expect(calls.body).toEqual({
      success: false,
      error: { message: 'Acesso negado', code: 'FORBIDDEN' },
    })
  })

  it('responde 401 quando nao ha req.user', () => {
    const { res, calls } = createMockRes()
    requireRole('user', 'admin')(reqWith(undefined), res, () => {
      /* noop */
    })
    expect(calls.status).toBe(401)
  })
})
