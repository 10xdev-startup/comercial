import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type BannerVariant = "info" | "success" | "warning" | "error"

export type BannerProps = {
  variant?: BannerVariant
  title: string
  description?: string
  className?: string
}

const VARIANTS: Record<BannerVariant, { icon: LucideIcon; box: string; icon_color: string }> = {
  info: { icon: Info, box: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30", icon_color: "text-blue-600" },
  success: { icon: CheckCircle2, box: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30", icon_color: "text-emerald-600" },
  warning: { icon: AlertTriangle, box: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30", icon_color: "text-amber-600" },
  error: { icon: XCircle, box: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30", icon_color: "text-red-600" },
}

export function Banner({ variant = "info", title, description, className }: BannerProps) {
  const config = VARIANTS[variant]
  const Icon = config.icon

  return (
    <div className={cn("flex w-full max-w-md items-start gap-3 rounded-lg border p-3", config.box, className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.icon_color)} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  )
}
