"use client"

import { Suspense, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { normalizeRedirectTarget } from "@/lib/authRedirect"
import { signInWithEmail } from "@/services/authService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function LoginForm(): React.JSX.Element {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const searchParams = useSearchParams()

  const redirectTarget = searchParams.get("redirect")
  const safeRedirectTarget = normalizeRedirectTarget(redirectTarget)
  const cadastroHref = redirectTarget ? `/cadastro?redirect=${encodeURIComponent(redirectTarget)}` : "/cadastro"

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!email.trim() || !password) {
      toast.error("Preencha email e senha.")
      return
    }
    setIsSubmitting(true)
    try {
      await signInWithEmail(email.trim(), password)
      // Full reload, nao router.push: garante que o gate do proxy.ts enxergue o
      // cookie de sessao recem-escrito antes de decidir a rota.
      window.location.assign(safeRedirectTarget)
    } catch {
      toast.error("Email ou senha inválidos.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 rounded-lg border border-border bg-card p-8 shadow-lg">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold text-card-foreground">Entrar na sua conta</h2>
        <p className="text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href={cadastroHref} className="font-medium text-primary hover:underline">Criar conta</Link>
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" disabled={isSubmitting} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" disabled={isSubmitting} className="h-11" />
        </div>
        <Button type="submit" className="flex h-11 w-full items-center justify-center gap-2 font-semibold" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  )
}

export default function LoginPage(): React.JSX.Element {
  // useSearchParams exige boundary de Suspense na renderizacao estatica.
  return (
    <Suspense fallback={<Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" aria-hidden />}>
      <LoginForm />
    </Suspense>
  )
}
