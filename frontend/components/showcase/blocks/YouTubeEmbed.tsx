import { cn } from "@/lib/utils"

export type YouTubeEmbedProps = {
  videoId: string
  title?: string
  className?: string
}

export function YouTubeEmbed({ videoId, title = "Vídeo do YouTube", className }: YouTubeEmbedProps) {
  return (
    <div className={cn("w-full max-w-md overflow-hidden rounded-xl border border-border bg-black shadow-sm", className)}>
      <div className="relative aspect-video">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}
