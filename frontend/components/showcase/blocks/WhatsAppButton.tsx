import { cn } from "@/lib/utils"
import { MessageCircle } from "lucide-react"

export type WhatsAppButtonProps = {
  /** Apenas dígitos com DDI, ex: "5511999999999" */
  phone: string
  message?: string
  label?: string
  className?: string
}

export function WhatsAppButton({ phone, message, label = "Falar no WhatsApp", className }: WhatsAppButtonProps) {
  const digits = phone.replace(/\D/g, "")
  const query = message ? "?text=" + encodeURIComponent(message) : ""
  const href = "https://wa.me/" + digits + query

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-green-500 px-5 text-sm font-medium text-white transition-colors hover:bg-green-600",
        className
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  )
}
