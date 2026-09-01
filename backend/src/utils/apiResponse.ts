import type { Response } from 'express'

/**
 * Envelope canônico de TODA resposta da API (decisão de contrato: WRAPPED).
 * Espelha o tipo do frontend (`frontend/services/apiResponse.ts`). Use SEMPRE os
 * helpers `sendOk`/`sendError` nos controllers — nunca `res.json(...)` cru — para
 * manter o formato consistente (blueprint §4).
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiErrorBody }

export interface ApiErrorBody {
  message: string
  /** Código estável para a UI ramificar (blueprint §3.5), ex.: `INSUFFICIENT_CREDITS`. */
  code?: string
}

/** Resposta de sucesso: envelopa `data` em `{ success: true, data }`. Default 200. */
export function sendOk<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { success: true, data }
  res.status(status).json(body)
}

/** Resposta de erro: envelopa `{ message, code? }` em `{ success: false, error }`. */
export function sendError(
  res: Response,
  status: number,
  message: string,
  code?: string,
): void {
  // exactOptionalPropertyTypes: omitir `code` quando ausente (não setar undefined).
  const error: ApiErrorBody = code === undefined ? { message } : { message, code }
  const body: ApiResponse<never> = { success: false, error }
  res.status(status).json(body)
}
