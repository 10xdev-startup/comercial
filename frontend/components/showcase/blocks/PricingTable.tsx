import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type PricingPlan = {
  name: string
  price: string
  period?: string
  features: string[]
  highlighted?: boolean
}

export type PricingTableProps = {
  plans: PricingPlan[]
  className?: string
}

export function PricingTable({ plans, className }: PricingTableProps) {
  return (
    <div className={cn("grid w-full max-w-2xl gap-3 sm:grid-cols-3", className)}>
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={cn(
            "rounded-xl border bg-card p-5 shadow-sm",
            plan.highlighted ? "border-primary ring-1 ring-primary" : "border-border"
          )}
        >
          <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-2xl font-bold tracking-tight text-foreground">{plan.price}</span>
            <span className="mb-1 text-xs text-muted-foreground">{plan.period ?? "/mês"}</span>
          </div>
          <ul className="mt-4 space-y-1.5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
