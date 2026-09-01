import { describe, it, expect } from '@jest/globals'
import type { Response } from 'express'
import { sendOk, sendError } from '@/utils/apiResponse'

/** Mock mínimo do `Response` do Express: captura status e body enviados. */
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

describe('apiResponse', () => {
  it('sendOk envelopa em { success: true, data } com status 200', () => {
    const { res, calls } = createMockRes()
    sendOk(res, { id: '1' })
    expect(calls.status).toBe(200)
    expect(calls.body).toEqual({ success: true, data: { id: '1' } })
  })

  it('sendOk aceita status customizado (ex.: 201)', () => {
    const { res, calls } = createMockRes()
    sendOk(res, { id: '2' }, 201)
    expect(calls.status).toBe(201)
  })

  it('sendError envelopa em { success: false, error } e OMITE code ausente', () => {
    const { res, calls } = createMockRes()
    sendError(res, 404, 'Não encontrado')
    expect(calls.status).toBe(404)
    expect(calls.body).toEqual({ success: false, error: { message: 'Não encontrado' } })
  })

  it('sendError inclui code quando fornecido', () => {
    const { res, calls } = createMockRes()
    sendError(res, 402, 'Sem créditos', 'INSUFFICIENT_CREDITS')
    expect(calls.body).toEqual({
      success: false,
      error: { message: 'Sem créditos', code: 'INSUFFICIENT_CREDITS' },
    })
  })
})
