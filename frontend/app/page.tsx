import Link from 'next/link'
import { Component, Database, Layers, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { isSupabaseConfigured } from '@/lib/supabaseConfigured'

// Landing publica em `/` — sem sidebar porque o grupo (lps) nao tem layout.tsx e
// este arquivo tambem esta fora de (dashboard). Conteudo placeholder falando do
// proprio template (10xDev Starter Kit) — troque pelo do produto.
const DESTAQUES = [
  { icon: Layers, text: 'Next.js 16 + Express 5, TypeScript de ponta a ponta' },
  { icon: ShieldCheck, text: 'Auth Supabase pronta — login, cadastro e onboarding' },
  { icon: Component, text: 'UI com shadcn/ui + Radix, ja configurada' },
  { icon: Database, text: 'Supabase (PostgreSQL), padrao Controller → Model → Database' },
]

export default function LandingPage(): React.JSX.Element {
  const appName = process.env['NEXT_PUBLIC_APP_NAME'] || 'Meu Projeto'
  // Sem Supabase configurado, login/cadastro nao completam de verdade — manda
  // direto pra area logada em vez de levar a um formulario que nao vai funcionar.
  const configured = isSupabaseConfigured()

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-16 px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-4xl font-bold tracking-tight">{appName}</h1>
        <p className="max-w-md text-muted-foreground">
          Troque este conteudo pelo do produto.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href={configured ? '/cadastro' : '/inicio'}>Criar conta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={configured ? '/login' : '/inicio'}>Entrar</Link>
          </Button>
        </div>
      </div>

      <div className="grid w-full gap-3 sm:grid-cols-2">
        {DESTAQUES.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="text-sm">{text}</span>
          </div>
        ))}
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        <Separator className="max-w-xs" />
        <p className="text-xs text-muted-foreground">
          Gerado a partir do template 10xDev Starter Kit — veja{' '}
          <code className="rounded bg-muted px-1 py-0.5">TEMPLATE.md</code> pro setup completo.
        </p>
      </div>
    </div>
  )
}
