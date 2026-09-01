import { insertErrorLog } from '@/models/errorLogModel'
import { notifyError } from '@/utils/telegramNotify'

/**
 * Ponto unico pros catches que hoje so logam local. Sempre grava em
 * error_logs (nunca se perde, mesmo se o Telegram cair ou nao estiver
 * configurado) e tenta o alerta — `notified` na linha reflete se o envio deu
 * certo. Nunca lanca: quem chama ja esta dentro de um catch alheio, sem pra
 * onde propagar.
 */
export async function reportError(params: {
  context: string
  error: unknown
  userId?: string | null
}): Promise<void> {
  const { context, error } = params
  const userId = params.userId ?? null
  const errorMessage = error instanceof Error ? error.message : String(error)

  const notified = await notifyError({ context, error, userId })

  try {
    await insertErrorLog({ context, errorMessage, userId, notified })
  } catch (dbErr) {
    console.error('[error-log] falha ao gravar error_logs:', dbErr instanceof Error ? dbErr.message : String(dbErr))
  }
}
