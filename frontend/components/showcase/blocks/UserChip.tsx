import { cn } from "@/lib/utils"

export type UserChipProps = {
  name: string
  email?: string
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

export function UserChip({ name, email, avatarUrl, className }: UserChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-4 shadow-sm",
        className
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials(name)}
        </span>
      )}
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
      </div>
    </div>
  )
}
