"use client"

import { Suspense, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { normalizeRedirectTarget, welcomeHref } from "@/lib/authRedirect"
import { signUpWithEmail } from "@/services/authService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const MIN_PASSWORD_LENGTH = 6

function CadastroForm(): React.JSX.Element {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirectTarget = searchParams.get("redirect")
  const safeRedirectTarget = normalizeRedirectTarget(redirectTarget)
  const loginHref = redirectTarget ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : "/login"

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Preencha todos os campos.")
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    setIsSubmitting(true)
    try {
      const { needsConfirmation } = await signUpWithEmail(email.trim(), password, name.trim())
      if (needsConfirmation) {
        toast.success("Conta criada! Confirme seu email pelo link que enviamos antes de entrar.")
        router.push(loginHref)
        return
      }
      // Full reload: o gate do proxy.ts precisa enxergar o cookie de sessao recem-escrito.
      window.location.assign(welcomeHref(safeRedirectTarget))
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (/registered|already|exists|cadastrad/i.test(message)) {
        toast.error("Este email já está cadastrado. Tente entrar.")
      } else {
        toast.error("Não foi possível criar a conta. Tente novamente.")
      }
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 rounded-lg border border-border bg-card p-8 shadow-lg">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold text-card-foreground">Criar sua conta</h2>
        <p className="text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href={loginHref} className="font-medium text-primary hover:underline">Entrar</Link>
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">Seu nome</label>
          <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria Souza" autoComplete="name" disabled={isSubmitting} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" disabled={isSubmitting} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" disabled={isSubmitting} minLength={MIN_PASSWORD_LENGTH} className="h-11 pr-10" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground" tabIndex={-1}>
              {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </button>
          </div>
        </div>
        <Button type="submit" className="flex h-11 w-full items-center justify-center gap-2 font-semibold" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isSubmitting ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
    </div>
  )
}

export default function CadastroPage(): React.JSX.Element {
  // useSearchParams exige boundary de Suspense na renderizacao estatica.
  return (
    <Suspense fallback={<Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" aria-hidden />}>
      <CadastroForm />
    </Suspense>
  )
}
