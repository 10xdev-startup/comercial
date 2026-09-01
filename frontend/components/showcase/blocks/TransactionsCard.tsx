import { cn } from "@/lib/utils"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"

export type Transaction = {
  id: string
  label: string
  date: string
  amount: string
  direction: "in" | "out"
}

export type TransactionsCardProps = {
  title?: string
  transactions: Transaction[]
  className?: string
}

export function TransactionsCard({
  title = "Transações recentes",
  transactions,
  className,
}: TransactionsCardProps) {
  return (
    <div className={cn("w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <ul className="space-y-2">
        {transactions.map((tx) => {
          const isIn = tx.direction === "in"
          return (
            <li key={tx.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  isIn ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                )}
              >
                {isIn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{tx.label}</p>
                <p className="text-xs text-muted-foreground">{tx.date}</p>
              </div>
              <span className={cn("text-sm font-semibold", isIn ? "text-emerald-600" : "text-foreground")}>
                {isIn ? "+" : "-"}
                {tx.amount}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
