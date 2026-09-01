/**
 * Erro de aplicacao com status HTTP + code estavel. Lance nos controllers/models
 * para erros ESPERADOS (404, 403, 422...); o `errorHandler` serializa no envelope
 * wrapped via `sendError`. Erros inesperados (Error puro) viram 500 generico.
 *
 * Ex.: `throw new AppError(404, 'Usuario nao encontrado', 'USER_NOT_FOUND')`.
 */
export class AppError extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}
