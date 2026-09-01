"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type TagProps = {
  label: string
  onRemove?: () => void
  className?: string
}

export function Tag({ label, onRemove, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground",
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="-mr-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Remover ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
