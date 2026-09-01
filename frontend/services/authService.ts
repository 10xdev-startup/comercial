import { createClient } from "@/lib/supabase/client"

/**
 * Auth do Supabase — email e senha, o único provider habilitado no projeto.
 * Fica FORA do barrel `services/index.ts` de propósito: o barrel é dos services de
 * domínio sobre o `apiClient`, e aqui quem fala é o SDK do Supabase (blueprint §1).
 */

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await createClient().auth.signInWithPassword({ email, password })
  if (error) throw error
}

/**
 * Cria a conta. O `name` vai pro `raw_user_meta_data`, mas o perfil em `public.users`
 * só nasce depois: o `supabaseMiddleware` cria a linha de forma preguiçosa na primeira
 * chamada autenticada ao backend (não há trigger de signup neste template).
 *
 * `needsConfirmation` existe porque o projeto pode rodar com `mailer_autoconfirm`
 * ligado ou desligado: com ele ligado o signUp devolve sessão na hora; desligado, o
 * signUp para de devolver sessão e quem chama precisa mandar o usuário confirmar o
 * email — sem este retorno o cadastro terminaria num estado mudo.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await createClient().auth.signUp({ email, password, options: { data: { name } } })
  if (error) throw error
  return { needsConfirmation: !data.session }
}

export async function signOut(): Promise<void> {
  const { error } = await createClient().auth.signOut()
  if (error) throw error
}
