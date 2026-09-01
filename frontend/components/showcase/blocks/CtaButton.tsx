import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

export type CtaButtonProps = {
  children: ReactNode
  onClick?: () => void
  withArrow?: boolean
  className?: string
}

export function CtaButton({ children, onClick, withArrow = true, className }: CtaButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.98]",
        className
      )}
    >
      {children}
      {withArrow && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
    </button>
  )
}
