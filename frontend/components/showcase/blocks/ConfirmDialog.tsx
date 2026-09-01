"use client"

import { useState, type ReactNode } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export type ConfirmDialogProps = {
  trigger: ReactNode
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm?: () => void
}

export function ConfirmDialog({
  trigger,
  title = "Tem certeza?",
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5 shadow-lg focus:outline-none">
          <div className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-5 w-5 text-red-600" />}
            <Dialog.Title className="text-base font-semibold text-foreground">{title}</Dialog.Title>
          </div>
          {description && (
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">{description}</Dialog.Description>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              {cancelLabel}
            </Dialog.Close>
            <button
              type="button"
              onClick={() => {
                onConfirm?.()
                setOpen(false)
              }}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors",
                destructive
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
