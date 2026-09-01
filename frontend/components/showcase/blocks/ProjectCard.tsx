import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

export type ProjectCardProps = {
  name: string
  description?: string
  tags?: string[]
  memberCount?: number
  updatedAt?: string
  onClick?: () => void
  className?: string
}

export function ProjectCard({
  name,
  description,
  tags = [],
  memberCount,
  updatedAt,
  onClick,
  className,
}: ProjectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full max-w-sm rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-foreground">{name}</h3>
        {typeof memberCount === "number" && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {memberCount}
          </span>
        )}
      </div>
      {description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
      {updatedAt && <p className="mt-3 text-[11px] text-muted-foreground/70">Atualizado {updatedAt}</p>}
    </button>
  )
}
