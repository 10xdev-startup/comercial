import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type SummaryCardProps = {
  icon: LucideIcon
  title: string
  value: string
  footer?: string
  accent?: "blue" | "emerald" | "violet" | "amber"
  className?: string
}

const ACCENTS: Record<NonNullable<SummaryCardProps["accent"]>, string> = {
  blue: "bg-blue-500/10 text-blue-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  violet: "bg-violet-500/10 text-violet-600",
  amber: "bg-amber-500/10 text-amber-600",
}

export function SummaryCard({ icon: Icon, title, value, footer, accent = "blue", className }: SummaryCardProps) {
  return (
    <div className={cn("flex w-full max-w-xs items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", ACCENTS[accent])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="truncate text-lg font-semibold text-foreground">{value}</p>
        {footer && <p className="truncate text-xs text-muted-foreground">{footer}</p>}
      </div>
    </div>
  )
}
