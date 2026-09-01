import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type LoadingSpinnerProps = {
  label?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZES: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
}

export function LoadingSpinner({ label, size = "md", className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
      <Loader2 className={cn("animate-spin", SIZES[size])} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}
