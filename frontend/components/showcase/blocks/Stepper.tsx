import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type StepperProps = {
  steps: string[]
  current: number
  className?: string
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn("flex items-center", className)}>
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        const last = index === steps.length - 1

        return (
          <li key={step} className={cn("flex items-center", !last && "flex-1")}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-xs font-medium",
                  active || done ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step}
              </span>
            </div>
            {!last && <span className={cn("mx-3 h-px flex-1", done ? "bg-primary" : "bg-border")} />}
          </li>
        )
      })}
    </ol>
  )
}
