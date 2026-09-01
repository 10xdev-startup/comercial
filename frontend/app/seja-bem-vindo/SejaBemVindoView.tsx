"use client"

import { useState } from "react"
import { ArrowRight, Loader2, Puzzle, Rocket, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { userService } from "@/services"

const DESTAQUES = [
  { icon: Rocket, text: "Comece agora — nenhuma configuração adicional necessária" },
  { icon: Puzzle, text: "Explore os componentes prontos para usar" },
  { icon: Settings, text: "Personalize conforme o seu produto evolui" },
]

export function SejaBemVindoView({
  nextDest,
  firstName,
}: {
  nextDest: string
  firstName: string | null
}): React.JSX.Element {
  const [isSaving, setIsSaving] = useState(false)

  const handleStart = async (): Promise<void> => {
    setIsSaving(true)
    try {
      await userService.onboard()
    } catch (error) {
      // `onboardedAt` marca que a tela ja foi vista — nao e permissao de acesso.
      // Falhar aqui (backend fora do ar, rede) nao pode barrar a entrada no produto.
      console.error("[seja-bem-vindo] Falha ao concluir o onboarding:", error)
    }
    // location.replace, nao router.push: tira esta rota do historico (o Voltar pula
    // pro que veio antes) e forca ida ao servidor, sem reaproveitar o Router Cache.
    window.location.replace(nextDest)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {firstName ? `Bem-vindo, ${firstName}!` : "Bem-vindo!"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            Sua conta está pronta. Troque este texto e os destaques abaixo pela
            proposta real do seu produto.
          </p>
        </div>

        <div className="space-y-3 text-left">
          {DESTAQUES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="text-sm">{text}</span>
            </div>
          ))}
        </div>

        <Button size="lg" className="w-full" disabled={isSaving} onClick={() => void handleStart()}>
          {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
          Explorar a plataforma
          {isSaving ? null : <ArrowRight className="ml-2 size-4" aria-hidden />}
        </Button>
      </div>
    </div>
  )
}
