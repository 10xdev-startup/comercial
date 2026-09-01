import { cn } from "@/lib/utils"

export type AvatarGroupItem = {
  name: string
  avatarUrl?: string
}

export type AvatarGroupProps = {
  users: AvatarGroupItem[]
  max?: number
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

export function AvatarGroup({ users, max = 4, className }: AvatarGroupProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - visible.length

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((user, index) => (
        <span
          key={user.name + index}
          className="-ml-2 first:ml-0 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-foreground"
          title={user.name}
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            initials(user.name)
          )}
        </span>
      ))}
      {overflow > 0 && (
        <span className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-semibold text-primary-foreground">
          +{overflow}
        </span>
      )}
    </div>
  )
}
