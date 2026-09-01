import { supabase } from '@/database/supabase'

export interface ErrorLogInput {
  context: string
  errorMessage: string
  userId?: string | null
  notified: boolean
}

/** Grava o erro em error_logs pra nao se perder mesmo se o alerta do Telegram falhar. */
export async function insertErrorLog(input: ErrorLogInput): Promise<void> {
  const { error } = await supabase.from('error_logs').insert({
    context: input.context,
    error_message: input.errorMessage,
    user_id: input.userId ?? null,
    notified: input.notified,
  })
  if (error) throw new Error(`Erro ao gravar error_logs: ${error.message}`)
}
