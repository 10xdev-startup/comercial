/**
 * Envelope canônico de TODA resposta da API (decisão de contrato: WRAPPED).
 *
 * O backend sempre responde nesta forma. O `apiClient` desembrulha UMA vez
 * (blueprint §4) e os services recebem `T` limpo — sem cast, sem `.data` espalhado.
 *
 * União discriminada por `success`: no sucesso só existe `data`; no erro só existe
 * `error`. O TypeScript obriga a checar `success` antes de acessar qualquer um.
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiErrorBody }

export interface ApiErrorBody {
  message: string
  /** Código estável para a UI ramificar (blueprint §3.5), ex.: `INSUFFICIENT_CREDITS`. */
  code?: string
}
