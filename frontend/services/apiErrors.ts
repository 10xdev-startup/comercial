/**
 * Erro canônico da API (blueprint §2 e §3.5): carrega `status` E `code`, nunca um
 * `Error` puro. A UI ramifica em cima do status/code do backend, então essa
 * informação não pode se perder. Mora aqui — fora do `apiClient` — para que um
 * componente que só quer *classificar* um erro não precise importar o transporte.
 */
export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
    this.code = code
  }
}

export function isApiRequestError(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError
}

/**
 * Converte qualquer throw num erro canônico. Já sendo `ApiRequestError`, passa
 * direto (não re-embrulha). Use no transporte para nunca deixar `Error` puro vazar.
 */
export function toApiRequestError(
  err: unknown,
  fallbackMessage: string,
): ApiRequestError {
  if (isApiRequestError(err)) return err
  const message = err instanceof Error ? err.message : fallbackMessage
  return new ApiRequestError(0, message)
}

// Helpers de classificação genéricos — a UI ramifica em cima deles.
export const requiresAuth = (err: unknown): boolean =>
  isApiRequestError(err) && err.status === 401
export const isForbidden = (err: unknown): boolean =>
  isApiRequestError(err) && err.status === 403
export const isNotFound = (err: unknown): boolean =>
  isApiRequestError(err) && err.status === 404
export const isConflict = (err: unknown): boolean =>
  isApiRequestError(err) && err.status === 409

// Exemplo de helper de DOMÍNIO (descomente e adapte): "sem créditos → abrir checkout".
// export const requiresCheckout = (err: unknown): boolean =>
//   isApiRequestError(err) && (err.status === 402 || err.code === "INSUFFICIENT_CREDITS")
