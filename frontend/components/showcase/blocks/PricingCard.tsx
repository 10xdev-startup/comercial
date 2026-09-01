import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type PricingCardProps = {
  plan: string
  price: string
  period?: string
  features: string[]
  highlighted?: boolean
  ctaLabel?: string
  onSelect?: () => void
  className?: string
}

export function PricingCard({
  plan,
  price,
  period = "/mês",
  features,
  highlighted = false,
  ctaLabel = "Assinar",
  onSelect,
  className,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[240px] rounded-xl border bg-card p-5 shadow-sm",
        highlighted ? "border-primary ring-1 ring-primary" : "border-border",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{plan}</h3>
        {highlighted && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
            Popular
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end gap-1">
        <span className="text-3xl font-bold tracking-tight text-foreground">{price}</span>
        <span className="mb-1 text-xs text-muted-foreground">{period}</span>
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {feature}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "mt-5 inline-flex h-9 w-full items-center justify-center rounded-md px-4 text-sm font-medium transition-colors",
          highlighted
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-border text-foreground hover:bg-muted"
        )}
      >
        {ctaLabel}
      </button>
    </div>
  )
}
