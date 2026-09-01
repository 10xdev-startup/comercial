import { UserModel } from '@/models/UserModel'

const TELEGRAM_API = 'https://api.telegram.org'

async function sendTelegramMessage(token: string, chatId: string, message: string): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Telegram API erro ${res.status}: ${body}`)
  }
}

/** Bot dedicado a alerta de erro — separado de qualquer outro bot que o produto venha a ter. */
async function notifySupportTelegram(message: string): Promise<void> {
  const token = process.env['TELEGRAM_SUPPORT_BOT_TOKEN']
  const chatId = process.env['TELEGRAM_SUPPORT_CHAT_ID']

  if (!token || !chatId) {
    throw new Error('TELEGRAM_SUPPORT_BOT_TOKEN ou TELEGRAM_SUPPORT_CHAT_ID nao configurado')
  }

  await sendTelegramMessage(token, chatId, message)
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Alerta de erro em ponto-chave. Feito pra ser chamado de dentro de um catch
 * que hoje so loga local (ninguem do time sabe) — por isso NUNCA lanca: se o
 * proprio Telegram (ou a busca do usuario) falhar, cai num console.error, sem
 * mais pra onde escalar dentro do catch alheio. Sem TELEGRAM_SUPPORT_BOT_TOKEN
 * / TELEGRAM_SUPPORT_CHAT_ID configurados, so pula o envio — reportError ainda
 * grava em error_logs normalmente. Retorna se o envio deu certo; quem chama
 * (errorReporting.reportError) usa isso pra marcar `notified` no error_logs.
 */
export async function notifyError(params: {
  context: string
  error: unknown
  userId?: string | null
}): Promise<boolean> {
  const { context, error, userId } = params
  const errorMessage = error instanceof Error ? error.message : String(error)
  const user = userId ? await UserModel.findById(userId).catch(() => null) : null

  const lines = [
    `🚨 <b>${escapeHtml(context)}</b>`,
    escapeHtml(errorMessage),
    user ? `👤 ${escapeHtml(user.name ?? 'Sem nome')}` : null,
    user ? `📧 ${escapeHtml(user.email)}` : null,
  ].filter((line): line is string => line != null)

  try {
    await notifySupportTelegram(lines.join('\n'))
    return true
  } catch (notifyErr) {
    console.error('[telegram] falha ao mandar alerta de erro:', notifyErr instanceof Error ? notifyErr.message : String(notifyErr))
    return false
  }
}
