import { cn } from "@/lib/utils"

export type Severity = "high" | "medium" | "low"

export type SeverityBadgeProps = {
  severity: Severity
  className?: string
}

const META: Record<Severity, { label: string; tone: string }> = {
  high: {
    label: "Alta",
    tone: "border-red-200 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  },
  medium: {
    label: "Média",
    tone: "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  },
  low: {
    label: "Baixa",
    tone: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
  },
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const meta = META[severity]
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-medium", meta.tone, className)}>
      {meta.label}
    </span>
  )
}
