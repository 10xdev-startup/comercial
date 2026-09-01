import { Quote } from "lucide-react"
import { cn } from "@/lib/utils"

export type TestimonialCardProps = {
  quote: string
  author: string
  role?: string
  avatarUrl?: string
  className?: string
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function TestimonialCard({ quote, author, role, avatarUrl, className }: TestimonialCardProps) {
  return (
    <figure className={cn("w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <Quote className="h-5 w-5 text-muted-foreground/50" />
      <blockquote className="mt-2 text-sm leading-relaxed text-foreground">{quote}</blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={author} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {initials(author)}
          </span>
        )}
        <div className="leading-tight">
          <p className="text-sm font-medium text-foreground">{author}</p>
          {role && <p className="text-xs text-muted-foreground">{role}</p>}
        </div>
      </figcaption>
    </figure>
  )
}
