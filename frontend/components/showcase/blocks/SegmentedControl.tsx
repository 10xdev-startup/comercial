"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export type SegmentedControlOption = {
  value: string
  label: string
}

export type SegmentedControlProps = {
  options: SegmentedControlOption[]
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
}

export function SegmentedControl({ options, defaultValue, onChange, className }: SegmentedControlProps) {
  const [active, setActive] = useState(defaultValue ?? options[0]?.value ?? "")

  const select = (value: string) => {
    setActive(value)
    onChange?.(value)
  }

  return (
    <div className={cn("inline-flex rounded-lg border border-border bg-muted/40 p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => select(option.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            active === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
