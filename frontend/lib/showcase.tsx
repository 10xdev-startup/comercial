import type { ReactNode } from "react"
import { DollarSign, Gauge, ShieldCheck, Sparkles, Zap } from "lucide-react"
import { StatCard } from "@/components/showcase/blocks/StatCard"
import { BalanceCard } from "@/components/showcase/blocks/BalanceCard"
import { TransactionsCard } from "@/components/showcase/blocks/TransactionsCard"
import { UserChip } from "@/components/showcase/blocks/UserChip"
import { SummaryCard } from "@/components/showcase/blocks/SummaryCard"
import { FeatureCard } from "@/components/showcase/blocks/FeatureCard"
import { PricingCard } from "@/components/showcase/blocks/PricingCard"
import { TestimonialCard } from "@/components/showcase/blocks/TestimonialCard"
import { ProjectCard } from "@/components/showcase/blocks/ProjectCard"
import { RepoCard } from "@/components/showcase/blocks/RepoCard"
import { AvatarGroup } from "@/components/showcase/blocks/AvatarGroup"
import { CtaButton } from "@/components/showcase/blocks/CtaButton"
import { WhatsAppButton } from "@/components/showcase/blocks/WhatsAppButton"
import { CopyButton } from "@/components/showcase/blocks/CopyButton"
import { GoogleAuthButton } from "@/components/showcase/blocks/GoogleAuthButton"
import { SegmentedControl } from "@/components/showcase/blocks/SegmentedControl"
import { EmptyState } from "@/components/showcase/blocks/EmptyState"
import { Banner } from "@/components/showcase/blocks/Banner"
import { SeverityBadge } from "@/components/showcase/blocks/SeverityBadge"
import { Tag } from "@/components/showcase/blocks/Tag"
import { LoadingSpinner } from "@/components/showcase/blocks/LoadingSpinner"
import { ProgressBar } from "@/components/showcase/blocks/ProgressBar"
import { Stepper } from "@/components/showcase/blocks/Stepper"
import { SkeletonCard } from "@/components/showcase/blocks/SkeletonCard"
import { CodeBlock } from "@/components/showcase/blocks/CodeBlock"
import { FileTree } from "@/components/showcase/blocks/FileTree"
import { YouTubeEmbed } from "@/components/showcase/blocks/YouTubeEmbed"
import { DiffViewer } from "@/components/showcase/blocks/DiffViewer"
import { ThemeToggle } from "@/components/showcase/blocks/ThemeToggle"
import { PageHeader } from "@/components/showcase/blocks/PageHeader"
import { FilterChips } from "@/components/showcase/blocks/FilterChips"
import { SearchInput } from "@/components/showcase/blocks/SearchInput"
import { Tabs } from "@/components/showcase/blocks/Tabs"
import { FaqAccordion } from "@/components/showcase/blocks/FaqAccordion"
import { ConfirmDialog } from "@/components/showcase/blocks/ConfirmDialog"
import { HeroSection } from "@/components/showcase/blocks/HeroSection"
import { FeatureGrid } from "@/components/showcase/blocks/FeatureGrid"
import { CTASection } from "@/components/showcase/blocks/CTASection"
import { PricingTable } from "@/components/showcase/blocks/PricingTable"

export type ShowcaseCategory = "Cards" | "Botões" | "Feedback" | "Conteúdo" | "Navegação" | "Marketing"

export type ShowcaseBlock = {
  id: string
  name: string
  category: ShowcaseCategory
  description: string
  /** Caminho do fonte (relativo a frontend/). O código exibido é lido deste arquivo. */
  file: string
  preview: ReactNode
}

export const SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  "Cards",
  "Botões",
  "Feedback",
  "Conteúdo",
  "Navegação",
  "Marketing",
]

const DIR = "components/showcase/blocks"

export const SHOWCASE_BLOCKS: ShowcaseBlock[] = [
  // ───────────────────────── Cards ─────────────────────────
  {
    id: "stat-card",
    name: "StatCard",
    category: "Cards",
    description: "Card de métrica com rótulo, valor, ícone e variação opcional.",
    file: `${DIR}/StatCard.tsx`,
    preview: (
      <StatCard label="Receita mensal" value="R$ 12.480" icon={DollarSign} delta={{ value: "+12%", positive: true }} />
    ),
  },
  {
    id: "balance-card",
    name: "BalanceCard",
    category: "Cards",
    description: "Card de saldo com valor em destaque, legenda e ação opcional.",
    file: `${DIR}/BalanceCard.tsx`,
    preview: <BalanceCard amount="R$ 1.250,00" caption="Atualizado agora" actionLabel="Adicionar saldo" />,
  },
  {
    id: "transactions-card",
    name: "TransactionsCard",
    category: "Cards",
    description: "Lista de transações com entrada/saída, data e valor.",
    file: `${DIR}/TransactionsCard.tsx`,
    preview: (
      <TransactionsCard
        transactions={[
          { id: "1", label: "Pagamento recebido", date: "Hoje, 14:20", amount: "R$ 320,00", direction: "in" },
          { id: "2", label: "Assinatura Pro", date: "Ontem", amount: "R$ 49,90", direction: "out" },
          { id: "3", label: "Reembolso", date: "12 mai", amount: "R$ 18,00", direction: "in" },
        ]}
      />
    ),
  },
  {
    id: "summary-card",
    name: "SummaryCard",
    category: "Cards",
    description: "Resumo compacto com ícone colorido, título e valor.",
    file: `${DIR}/SummaryCard.tsx`,
    preview: <SummaryCard icon={DollarSign} title="Faturamento" value="R$ 8.200" footer="+8% no mês" accent="emerald" />,
  },
  {
    id: "feature-card",
    name: "FeatureCard",
    category: "Cards",
    description: "Card de funcionalidade com ícone, título e descrição.",
    file: `${DIR}/FeatureCard.tsx`,
    preview: <FeatureCard icon={Sparkles} title="IA integrada" description="Gere conteúdo e análises com um clique." />,
  },
  {
    id: "pricing-card",
    name: "PricingCard",
    category: "Cards",
    description: "Card de plano com preço, lista de benefícios e destaque.",
    file: `${DIR}/PricingCard.tsx`,
    preview: (
      <PricingCard plan="Pro" price="R$ 49" highlighted features={["Projetos ilimitados", "Suporte prioritário", "Analytics"]} />
    ),
  },
  {
    id: "testimonial-card",
    name: "TestimonialCard",
    category: "Cards",
    description: "Depoimento com citação, autor e cargo.",
    file: `${DIR}/TestimonialCard.tsx`,
    preview: <TestimonialCard quote="Esse template me economizou semanas de trabalho." author="Marina Lopes" role="Founder, Acme" />,
  },
  {
    id: "project-card",
    name: "ProjectCard",
    category: "Cards",
    description: "Card de projeto com tags, nº de membros e data.",
    file: `${DIR}/ProjectCard.tsx`,
    preview: (
      <ProjectCard
        name="Painel Financeiro"
        description="Dashboard de receitas, despesas e metas."
        tags={["Next.js", "Supabase"]}
        memberCount={4}
        updatedAt="há 2h"
      />
    ),
  },
  {
    id: "repo-card",
    name: "RepoCard",
    category: "Cards",
    description: "Card de repositório com linguagem, stars e forks.",
    file: `${DIR}/RepoCard.tsx`,
    preview: (
      <RepoCard name="acme/dashboard" description="Admin dashboard open-source." language="TypeScript" stars={1280} forks={94} />
    ),
  },
  {
    id: "avatar-group",
    name: "AvatarGroup",
    category: "Cards",
    description: "Avatares empilhados com contador de excedentes.",
    file: `${DIR}/AvatarGroup.tsx`,
    preview: (
      <AvatarGroup
        users={[
          { name: "Ana Souza" },
          { name: "Bruno Lima" },
          { name: "Carla Dias" },
          { name: "Diego Reis" },
          { name: "Eva Martins" },
        ]}
        max={4}
      />
    ),
  },
  {
    id: "user-chip",
    name: "UserChip",
    category: "Cards",
    description: "Chip de usuário com avatar (ou iniciais), nome e email.",
    file: `${DIR}/UserChip.tsx`,
    preview: <UserChip name="Ana Souza" email="ana@exemplo.com" />,
  },

  // ───────────────────────── Botões ─────────────────────────
  {
    id: "cta-button",
    name: "CtaButton",
    category: "Botões",
    description: "Botão de chamada para ação com gradiente e seta animada.",
    file: `${DIR}/CtaButton.tsx`,
    preview: <CtaButton>Começar agora</CtaButton>,
  },
  {
    id: "whatsapp-button",
    name: "WhatsAppButton",
    category: "Botões",
    description: "Botão que abre uma conversa no WhatsApp com mensagem pré-preenchida.",
    file: `${DIR}/WhatsAppButton.tsx`,
    preview: <WhatsAppButton phone="5511999999999" message="Olá! Vim pelo site." />,
  },
  {
    id: "copy-button",
    name: "CopyButton",
    category: "Botões",
    description: "Botão que copia um valor para a área de transferência com feedback.",
    file: `${DIR}/CopyButton.tsx`,
    preview: <CopyButton value="npx create-next-app" label="npx create-next-app" />,
  },
  {
    id: "google-auth-button",
    name: "GoogleAuthButton",
    category: "Botões",
    description: "Botão de login com Google (ícone oficial).",
    file: `${DIR}/GoogleAuthButton.tsx`,
    preview: <GoogleAuthButton />,
  },
  {
    id: "segmented-control",
    name: "SegmentedControl",
    category: "Botões",
    description: "Seletor segmentado para alternar entre opções.",
    file: `${DIR}/SegmentedControl.tsx`,
    preview: (
      <SegmentedControl
        options={[
          { value: "dia", label: "Dia" },
          { value: "semana", label: "Semana" },
          { value: "mes", label: "Mês" },
        ]}
      />
    ),
  },

  // ───────────────────────── Feedback ─────────────────────────
  {
    id: "empty-state",
    name: "EmptyState",
    category: "Feedback",
    description: "Estado vazio com ícone, título, descrição e ação opcional.",
    file: `${DIR}/EmptyState.tsx`,
    preview: (
      <EmptyState title="Nada por aqui ainda" description="Crie seu primeiro item para começar." actionLabel="Criar item" />
    ),
  },
  {
    id: "banner",
    name: "Banner",
    category: "Feedback",
    description: "Aviso com variantes info, sucesso, alerta e erro.",
    file: `${DIR}/Banner.tsx`,
    preview: <Banner variant="success" title="Tudo certo!" description="Suas alterações foram salvas." />,
  },
  {
    id: "severity-badge",
    name: "SeverityBadge",
    category: "Feedback",
    description: "Selo de severidade (alta, média, baixa).",
    file: `${DIR}/SeverityBadge.tsx`,
    preview: (
      <div className="flex gap-2">
        <SeverityBadge severity="high" />
        <SeverityBadge severity="medium" />
        <SeverityBadge severity="low" />
      </div>
    ),
  },
  {
    id: "tag",
    name: "Tag",
    category: "Feedback",
    description: "Chip de marcação, com remoção opcional.",
    file: `${DIR}/Tag.tsx`,
    preview: (
      <div className="flex gap-2">
        <Tag label="design" />
        <Tag label="frontend" onRemove={() => {}} />
      </div>
    ),
  },
  {
    id: "loading-spinner",
    name: "LoadingSpinner",
    category: "Feedback",
    description: "Indicador de carregamento com rótulo opcional.",
    file: `${DIR}/LoadingSpinner.tsx`,
    preview: <LoadingSpinner label="Carregando..." />,
  },
  {
    id: "progress-bar",
    name: "ProgressBar",
    category: "Feedback",
    description: "Barra de progresso com rótulo e percentual.",
    file: `${DIR}/ProgressBar.tsx`,
    preview: <ProgressBar value={68} label="Upload" />,
  },
  {
    id: "stepper",
    name: "Stepper",
    category: "Feedback",
    description: "Indicador de etapas com estado concluído/atual.",
    file: `${DIR}/Stepper.tsx`,
    preview: <Stepper steps={["Conta", "Plano", "Pronto"]} current={1} />,
  },
  {
    id: "skeleton-card",
    name: "SkeletonCard",
    category: "Feedback",
    description: "Placeholder animado para carregamento de cards.",
    file: `${DIR}/SkeletonCard.tsx`,
    preview: <SkeletonCard />,
  },

  // ───────────────────────── Conteúdo ─────────────────────────
  {
    id: "code-block",
    name: "CodeBlock",
    category: "Conteúdo",
    description: "Bloco de código com rótulo de linguagem e botão copiar.",
    file: `${DIR}/CodeBlock.tsx`,
    preview: <CodeBlock language="tsx" code={"export function Ola() {\n  return <h1>Olá!</h1>\n}"} />,
  },
  {
    id: "file-tree",
    name: "FileTree",
    category: "Conteúdo",
    description: "Árvore de arquivos colapsável com pastas e arquivos.",
    file: `${DIR}/FileTree.tsx`,
    preview: (
      <FileTree
        nodes={[
          {
            name: "src",
            children: [
              { name: "components", children: [{ name: "Button.tsx" }, { name: "Card.tsx" }] },
              { name: "index.ts" },
            ],
          },
          { name: "package.json" },
        ]}
      />
    ),
  },
  {
    id: "youtube-embed",
    name: "YouTubeEmbed",
    category: "Conteúdo",
    description: "Player do YouTube responsivo (16:9).",
    file: `${DIR}/YouTubeEmbed.tsx`,
    preview: <YouTubeEmbed videoId="dQw4w9WgXcQ" />,
  },
  {
    id: "diff-viewer",
    name: "DiffViewer",
    category: "Conteúdo",
    description: "Visualizador de diff com linhas adicionadas/removidas.",
    file: `${DIR}/DiffViewer.tsx`,
    preview: (
      <DiffViewer
        filename="soma.ts"
        lines={[
          { type: "context", text: "function soma(a, b) {" },
          { type: "del", text: "  return a + b" },
          { type: "add", text: "  return a + b + 1" },
          { type: "context", text: "}" },
        ]}
      />
    ),
  },
  {
    id: "theme-toggle",
    name: "ThemeToggle",
    category: "Conteúdo",
    description: "Botão que alterna entre tema claro e escuro.",
    file: `${DIR}/ThemeToggle.tsx`,
    preview: <ThemeToggle />,
  },

  // ───────────────────────── Navegação ─────────────────────────
  {
    id: "page-header",
    name: "PageHeader",
    category: "Navegação",
    description: "Cabeçalho de página com título, subtítulo e ações.",
    file: `${DIR}/PageHeader.tsx`,
    preview: (
      <PageHeader
        title="Projetos"
        subtitle="Gerencie todos os seus projetos"
        actions={
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Novo
          </button>
        }
      />
    ),
  },
  {
    id: "filter-chips",
    name: "FilterChips",
    category: "Navegação",
    description: "Chips de filtro com seleção múltipla.",
    file: `${DIR}/FilterChips.tsx`,
    preview: <FilterChips options={["React", "Next.js", "Tailwind", "Supabase"]} defaultSelected={["React"]} />,
  },
  {
    id: "search-input",
    name: "SearchInput",
    category: "Navegação",
    description: "Campo de busca com ícone e botão de limpar.",
    file: `${DIR}/SearchInput.tsx`,
    preview: <SearchInput placeholder="Buscar projetos..." />,
  },
  {
    id: "tabs",
    name: "Tabs",
    category: "Navegação",
    description: "Abas simples controladas por estado.",
    file: `${DIR}/Tabs.tsx`,
    preview: (
      <Tabs
        tabs={[
          { value: "conta", label: "Conta", content: "Configurações da conta." },
          { value: "perfil", label: "Perfil", content: "Edite seu perfil público." },
          { value: "plano", label: "Plano", content: "Gerencie sua assinatura." },
        ]}
      />
    ),
  },
  {
    id: "faq-accordion",
    name: "FaqAccordion",
    category: "Navegação",
    description: "Lista de perguntas frequentes expansível.",
    file: `${DIR}/FaqAccordion.tsx`,
    preview: (
      <FaqAccordion
        items={[
          { question: "Como começo?", answer: "Clique em copiar código e cole no seu projeto." },
          { question: "Preciso de backend?", answer: "Não — os blocos são puramente visuais." },
        ]}
      />
    ),
  },
  {
    id: "confirm-dialog",
    name: "ConfirmDialog",
    category: "Navegação",
    description: "Diálogo de confirmação para ações destrutivas.",
    file: `${DIR}/ConfirmDialog.tsx`,
    preview: (
      <ConfirmDialog
        title="Excluir conta?"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        trigger={
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            Excluir conta
          </button>
        }
      />
    ),
  },

  // ───────────────────────── Marketing ─────────────────────────
  {
    id: "hero-section",
    name: "HeroSection",
    category: "Marketing",
    description: "Seção hero com badge, título, subtítulo e CTAs.",
    file: `${DIR}/HeroSection.tsx`,
    preview: (
      <HeroSection
        badge="Novo"
        title="Construa mais rápido"
        subtitle="Um template full-stack pronto para produção."
        secondaryCta="Ver docs"
      />
    ),
  },
  {
    id: "feature-grid",
    name: "FeatureGrid",
    category: "Marketing",
    description: "Grade de funcionalidades com ícones.",
    file: `${DIR}/FeatureGrid.tsx`,
    preview: (
      <FeatureGrid
        features={[
          { icon: Zap, title: "Rápido", description: "Turbopack e React 19." },
          { icon: ShieldCheck, title: "Seguro", description: "Auth e RLS prontos." },
          { icon: Gauge, title: "Escalável", description: "Padrão Controller→Model." },
        ]}
      />
    ),
  },
  {
    id: "cta-section",
    name: "CTASection",
    category: "Marketing",
    description: "Faixa de conversão com gradiente e botão.",
    file: `${DIR}/CTASection.tsx`,
    preview: <CTASection title="Pronto para começar?" description="Crie sua conta em segundos." ctaLabel="Criar conta" />,
  },
  {
    id: "pricing-table",
    name: "PricingTable",
    category: "Marketing",
    description: "Tabela de planos com destaque para o recomendado.",
    file: `${DIR}/PricingTable.tsx`,
    preview: (
      <PricingTable
        plans={[
          { name: "Free", price: "R$ 0", features: ["1 projeto", "Comunidade"] },
          { name: "Pro", price: "R$ 49", features: ["Ilimitado", "Suporte"], highlighted: true },
          { name: "Team", price: "R$ 99", features: ["Tudo do Pro", "SSO"] },
        ]}
      />
    ),
  },
]
