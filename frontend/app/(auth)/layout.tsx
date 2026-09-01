import { Layers, Shield, Zap } from 'lucide-react'

// Moldura das telas de entrada (/login e /cadastro). O grupo (auth) some da URL e
// existe justamente por este layout: a coluna de branding é idêntica nas duas telas.
// A tela de boas-vindas NAO entra aqui — ela ocupa a largura toda.

const DESTAQUES = [
  { icon: Zap, text: 'Configuração rápida, comece a usar em minutos' },
  { icon: Shield, text: 'Seus dados protegidos com autenticação segura' },
  { icon: Layers, text: 'Tudo em um só lugar' },
]

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const appName = process.env['NEXT_PUBLIC_APP_NAME'] || 'Meu Projeto'

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-col items-center justify-center bg-sidebar p-12 text-sidebar-foreground lg:flex lg:w-[42%]">
        <div className="max-w-md space-y-8">
          <h1 className="text-center text-4xl font-bold">{appName}</h1>
          <p className="text-center text-lg leading-relaxed text-sidebar-foreground/80">
            Troque estes destaques pelo do seu produto.
          </p>
          <div className="mt-8 space-y-4">
            {DESTAQUES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-base">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
