"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type SearchInputProps = {
  placeholder?: string
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
}

export function SearchInput({ placeholder = "Buscar...", defaultValue = "", onChange, className }: SearchInputProps) {
  const [value, setValue] = useState(defaultValue)

  const update = (next: string) => {
    setValue(next)
    onChange?.(next)
  }

  return (
    <div className={cn("relative w-full max-w-xs", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => update(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => update("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
