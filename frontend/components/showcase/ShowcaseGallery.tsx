"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SHOWCASE_BLOCKS, SHOWCASE_CATEGORIES, type ShowcaseCategory } from "@/lib/showcase"

type Filter = ShowcaseCategory | "all"

export function ShowcaseGallery({ codeById }: { codeById: Record<string, string> }) {
  const [filter, setFilter] = useState<Filter>("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const blocks =
    filter === "all" ? SHOWCASE_BLOCKS : SHOWCASE_BLOCKS.filter((b) => b.category === filter)

  const handleCopy = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      toast.success("Código copiado!")
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
    } catch {
      toast.error("Não foi possível copiar")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["all", ...SHOWCASE_CATEGORIES] as Filter[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            {c === "all" ? "Todos" : c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {blocks.map((block) => (
          <div key={block.id} className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{block.name}</h3>
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {block.category}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{block.description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(block.id, codeById[block.id] ?? "")}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {copiedId === block.id ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedId === block.id ? "Copiado" : "Copiar código"}
              </button>
            </div>
            <div className="flex min-h-[140px] items-center justify-center bg-muted/30 p-6">
              {block.preview}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
