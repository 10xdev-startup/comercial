import { cn } from "@/lib/utils"

export type ProgressBarProps = {
  value: number
  label?: string
  showValue?: boolean
  className?: string
}

export function ProgressBar({ value, label, showValue = true, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={cn("w-full max-w-xs", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="font-medium text-foreground">{label}</span>}
          {showValue && <span className="tabular-nums text-muted-foreground">{clamped}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
