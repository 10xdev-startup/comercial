import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type HeroSectionProps = {
  badge?: string
  title: string
  subtitle?: string
  primaryCta?: string
  secondaryCta?: string
  className?: string
}

export function HeroSection({ badge, title, subtitle, primaryCta = "Começar", secondaryCta, className }: HeroSectionProps) {
  return (
    <section className={cn("w-full max-w-2xl rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-sm", className)}>
      {badge && (
        <span className="inline-flex rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          {badge}
        </span>
      )}
      <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      {subtitle && <p className="mx-auto mt-3 max-w-md text-pretty text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {primaryCta}
          <ArrowRight className="h-4 w-4" />
        </button>
        {secondaryCta && (
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-lg border border-border px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {secondaryCta}
          </button>
        )}
      </div>
    </section>
  )
}
