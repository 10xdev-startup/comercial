import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { normalizeRedirectTarget } from "@/lib/authRedirect"
import { SejaBemVindoView } from "./SejaBemVindoView"

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type ProfileRow = { name: string | null; onboarded_at: string | null }

// Server Component de proposito: a checagem de onboarded_at acontece ANTES de sair
// qualquer HTML. Feita no cliente (useEffect + replace), a tela apareceria por um
// instante a cada F5, bookmark ou botao voltar de quem ja concluiu o onboarding.
export default async function SejaBemVindoPage({ searchParams }: Props): Promise<React.JSX.Element> {
  // Deep link preservado pelo cadastro (ex.: quem tentou abrir uma pagina protegida).
  const nextDest = normalizeRedirectTarget((await searchParams)["next"])

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // public.users nao tem RLS documentado no CLAUDE.md deste template, entao a leitura
  // abaixo funciona aberta. Se/quando RLS for habilitado, precisa de uma policy de
  // select da propria linha (id = auth.uid()) pra essa query continuar funcionando.
  const { data, error } = await supabase
    .from("users")
    .select("name, onboarded_at")
    .eq("id", user.id)
    .maybeSingle()

  // Fail-open: se a leitura falhar nao da pra saber se ja houve onboarding, e prender
  // o usuario nesta tela e pior do que mostra-la uma vez a mais.
  if (error) {
    console.error("[seja-bem-vindo] Erro ao ler onboarded_at:", error.message)
    redirect(nextDest)
  }

  const profile = data as ProfileRow | null
  if (profile?.onboarded_at != null) redirect(nextDest)

  const firstName = profile?.name?.trim().split(" ")[0] ?? null

  return <SejaBemVindoView nextDest={nextDest} firstName={firstName} />
}
