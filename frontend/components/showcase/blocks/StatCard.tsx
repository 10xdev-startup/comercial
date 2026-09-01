import { cn } from "@/lib/utils"
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react"

export type StatCardProps = {
  label: string
  value: string
  icon?: LucideIcon
  delta?: { value: string; positive?: boolean }
  className?: string
}

export function StatCard({ label, value, icon: Icon, delta, className }: StatCardProps) {
  return (
    <div className={cn("w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {delta && (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-0.5 text-xs font-medium",
              delta.positive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {delta.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta.value}
          </span>
        )}
      </div>
    </div>
  )
}
