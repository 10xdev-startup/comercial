import { GitFork, Star } from "lucide-react"
import { cn } from "@/lib/utils"

export type RepoCardProps = {
  name: string
  description?: string
  language?: string
  languageColor?: string
  stars?: number
  forks?: number
  className?: string
}

export function RepoCard({
  name,
  description,
  language,
  languageColor = "#3178c6",
  stars,
  forks,
  className,
}: RepoCardProps) {
  return (
    <div className={cn("w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <h3 className="text-sm font-semibold text-blue-600 hover:underline">{name}</h3>
      {description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        {language && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor }} />
            {language}
          </span>
        )}
        {typeof stars === "number" && (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {stars}
          </span>
        )}
        {typeof forks === "number" && (
          <span className="inline-flex items-center gap-1">
            <GitFork className="h-3.5 w-3.5" />
            {forks}
          </span>
        )}
      </div>
    </div>
  )
}
