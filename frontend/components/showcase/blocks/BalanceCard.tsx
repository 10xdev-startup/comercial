import { cn } from "@/lib/utils"
import { Wallet } from "lucide-react"

export type BalanceCardProps = {
  label?: string
  amount: string
  caption?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function BalanceCard({
  label = "Saldo disponível",
  amount,
  caption,
  actionLabel,
  onAction,
  className,
}: BalanceCardProps) {
  return (
    <div className={cn("w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Wallet className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-foreground">{amount}</div>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
