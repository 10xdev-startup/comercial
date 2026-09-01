import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  Boxes,
  Component,
  Container,
  Database,
  ExternalLink,
  Palette,
  Server,
  Sparkles,
  TerminalSquare,
} from "lucide-react"

type InsumoGroup = {
  icon: LucideIcon
  title: string
  items: string[]
}

// Inventário do que já vem pronto neste repositório (template full-stack).
const INSUMO_GROUPS: InsumoGroup[] = [
  {
    icon: Boxes,
    title: "Estrutura full-stack",
    items: [
      "Monorepo com frontend/ (Next.js) e backend/ (Express) separados",
      "Path aliases @/* configurados nos dois projetos",
      "Variáveis de ambiente (.env e .env.example) prontas",
    ],
  },
  {
    icon: Component,
    title: "Frontend (Next.js 16 + React 19)",
    items: [
      "App Router com TypeScript estrito",
      "Layout de dashboard com sidebar responsiva (AppSidebar)",
      "Hook useIsMobile e utilitários (cn, lib/utils)",
    ],
  },
  {
    icon: Sparkles,
    title: "Vitrine de componentes",
    items: [
      "39 blocos prontos para copiar e colar",
      "6 categorias: Botões, Cards, Conteúdo, Feedback, Marketing, Navegação",
      "Botão “Copiar código” lendo o fonte real de cada bloco",
    ],
  },
  {
    icon: Palette,
    title: "Design system",
    items: [
      "8 componentes shadcn/ui sobre Radix (button, input, sheet, sidebar…)",
      "Tailwind CSS com tema claro/escuro e tokens de cor",
      "Toasts (sonner) e ícones (lucide-react)",
    ],
  },
  {
    icon: Server,
    title: "Backend (Express 5 + TypeScript)",
    items: [
      "Entry point com CORS e JSON prontos",
      "Endpoint /health de exemplo",
      "Padrão Controller → Model → Database documentado",
    ],
  },
  {
    icon: Database,
    title: "Banco & autenticação",
    items: [
      "Client Supabase (PostgreSQL) configurado",
      "Auth via Supabase + Google OAuth (JWT Bearer)",
      "Convenções de naming snake_case / kebab-case definidas",
    ],
  },
  {
    icon: Container,
    title: "Deploy & infraestrutura",
    items: [
      "Dockerfile + .dockerignore para frontend e backend",
      "GitHub Actions: deploy automático em prod no push para main",
      "Skill /deploy-azure (Container Registry + App Service)",
      "ESLint configurado nos dois projetos",
    ],
  },
  {
    icon: TerminalSquare,
    title: "Automação de dev (Claude Code & Cursor)",
    items: [
      "29 skills: /commit, /pr, /ship, /qa, /review, /investigate…",
      "Fluxo de Git/PR e resolução de conflitos automatizados",
      "Config Cursor: commands, rules e pastas de plans/pr-comments",
      "CLAUDE.md com regras de código e idioma do projeto",
    ],
  },
]

export function RepoInsumos() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚀</span>
          <h2 className="text-base font-semibold text-foreground">Bem-vindo ao template</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Seja bem-vindo a esse template. Abaixo estão os insumos que já vêm prontos — use como
          ponto de partida do seu projeto. Se quiser ajuda para construir, acesse:
        </p>
        <Link
          href="https://10xdev.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          10xdev.com.br
        </Link>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">O que já vem pronto neste repositório</h3>
          <p className="text-xs text-muted-foreground">
            Insumos entregues no template — clique nos itens e adapte ao seu projeto.
          </p>
        </div>
        <Link
          href="https://10xdev.com.br/projects/template-nodejs-express-next-supabase-0f65dd?from=BhkiQG"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4 text-primary" />
          Ajude a melhorar este repositório
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {INSUMO_GROUPS.map((group) => {
          const Icon = group.icon
          return (
            <div key={group.title} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              </div>
              <ul className="mt-3 space-y-1.5">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                    <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
