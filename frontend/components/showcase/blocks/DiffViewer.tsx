import { cn } from "@/lib/utils"

export type DiffLine = {
  type: "add" | "del" | "context"
  text: string
}

export type DiffViewerProps = {
  filename?: string
  lines: DiffLine[]
  className?: string
}

const LINE_STYLE: Record<DiffLine["type"], { row: string; sign: string }> = {
  add: { row: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", sign: "+" },
  del: { row: "bg-red-500/10 text-red-700 dark:text-red-300", sign: "-" },
  context: { row: "text-muted-foreground", sign: " " },
}

export function DiffViewer({ filename, lines, className }: DiffViewerProps) {
  return (
    <div className={cn("w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-sm", className)}>
      {filename && (
        <div className="border-b border-border px-3 py-1.5 font-mono text-xs text-muted-foreground">{filename}</div>
      )}
      <pre className="overflow-x-auto py-1 text-xs leading-relaxed">
        {lines.map((line, index) => {
          const style = LINE_STYLE[line.type]
          return (
            <div key={index} className={cn("flex px-3 font-mono", style.row)}>
              <span className="mr-2 w-3 shrink-0 select-none opacity-60">{style.sign}</span>
              <span className="whitespace-pre">{line.text}</span>
            </div>
          )
        })}
      </pre>
    </div>
  )
}
