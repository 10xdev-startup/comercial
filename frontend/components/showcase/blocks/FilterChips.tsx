"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export type FilterChipsProps = {
  options: string[]
  defaultSelected?: string[]
  onChange?: (selected: string[]) => void
  className?: string
}

export function FilterChips({ options, defaultSelected = [], onChange, className }: FilterChipsProps) {
  const [selected, setSelected] = useState<string[]>(defaultSelected)

  const toggle = (option: string) => {
    const next = selected.includes(option)
      ? selected.filter((value) => value !== option)
      : [...selected, option]
    setSelected(next)
    onChange?.(next)
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => toggle(option)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            selected.includes(option)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
