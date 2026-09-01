import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type FeatureGridItem = {
  icon: LucideIcon
  title: string
  description: string
}

export type FeatureGridProps = {
  features: FeatureGridItem[]
  className?: string
}

export function FeatureGrid({ features, className }: FeatureGridProps) {
  return (
    <div className={cn("grid w-full max-w-2xl gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {features.map((feature) => {
        const Icon = feature.icon
        return (
          <div key={feature.title} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-foreground">{feature.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
        )
      })}
    </div>
  )
}
