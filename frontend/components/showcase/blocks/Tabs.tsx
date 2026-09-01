"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type TabItem = {
  value: string
  label: string
  content: ReactNode
}

export type TabsProps = {
  tabs: TabItem[]
  defaultValue?: string
  className?: string
}

export function Tabs({ tabs, defaultValue, className }: TabsProps) {
  const [active, setActive] = useState(defaultValue ?? tabs[0]?.value ?? "")
  const current = tabs.find((tab) => tab.value === active)

  return (
    <div className={cn("w-full max-w-sm", className)}>
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActive(tab.value)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active === tab.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-3 text-sm text-muted-foreground">{current?.content}</div>
    </div>
  )
}
