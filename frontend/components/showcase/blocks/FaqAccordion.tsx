"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type FaqItem = {
  question: string
  answer: string
}

export type FaqAccordionProps = {
  items: FaqItem[]
  className?: string
}

export function FaqAccordion({ items, className }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className={cn("w-full max-w-md divide-y divide-border rounded-lg border border-border bg-card", className)}>
      {items.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <div key={index}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground"
              aria-expanded={isOpen}
            >
              {item.question}
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
              />
            </button>
            {isOpen && <p className="px-4 pb-3 text-sm text-muted-foreground">{item.answer}</p>}
          </div>
        )
      })}
    </div>
  )
}
