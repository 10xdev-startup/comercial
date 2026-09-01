import Link from 'next/link'
import { BarChart3, FileText, Link2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { isSupabaseConfigured } from '@/lib/supabaseConfigured'

const DESTAQUES = [
  { icon: Link2, text: 'Conecte Meta Ads, Google Ads e planilhas' },
  { icon: FileText, text: 'Gere o relatório do cliente com análise escrita por IA' },
  { icon: Users, text: 'Acompanhe leads no CRM, para agências, gestores e donos de negócio' },
  { icon: BarChart3, text: 'R$ 75 por cliente / mês, com trial de 30 dias' },
]

export default function LandingPage(): React.JSX.Element {
  const appName = process.env['NEXT_PUBLIC_APP_NAME'] || '10xMídia'
  const configured = isSupabaseConfigured()

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-16 px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-4xl font-bold tracking-tight">{appName}</h1>
        <p className="max-w-xl text-muted-foreground">
          Conecte Meta Ads, Google Ads e planilhas, gere o relatório do cliente com análise
          escrita por IA e acompanhe leads no CRM.
        </p>
        <p className="max-w-lg text-sm text-muted-foreground">
          Como funciona: conectar fontes → unificar o período → entregar análise revisada / mensagem.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href={configured ? '/cadastro' : '/crm'}>Criar conta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={configured ? '/login' : '/crm'}>Entrar</Link>
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
          Selos Google Partner e Meta Business Partner no site da empresa não são certificados
          auditados por este produto. Copy de “30 segundos” é marketing, não SLA.
        </p>
      </div>
    </div>
  )
}
