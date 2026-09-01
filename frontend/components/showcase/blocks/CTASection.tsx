import { cn } from "@/lib/utils"

export type CTASectionProps = {
  title: string
  description?: string
  ctaLabel?: string
  className?: string
}

export function CTASection({ title, description, ctaLabel = "Começar agora", className }: CTASectionProps) {
  return (
    <section
      className={cn(
        "w-full max-w-2xl overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 px-6 py-10 text-center shadow-sm",
        className
      )}
    >
      <h2 className="text-balance text-2xl font-bold tracking-tight text-white">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-white/80">{description}</p>}
      <button
        type="button"
        className="mt-6 inline-flex h-11 items-center rounded-lg bg-white px-6 text-sm font-semibold text-blue-700 transition-transform hover:scale-[1.02]"
      >
        {ctaLabel}
      </button>
    </section>
  )
}
