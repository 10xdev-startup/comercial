import { pauseReasonLabel } from "@/lib/pauseReasons"
import type { CrmReadiness } from "@/types/crm"

export type ReadinessStripProps = {
  readiness: CrmReadiness
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        ok
          ? "rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-800 dark:text-emerald-300"
          : "rounded-full bg-muted px-2 py-1 text-muted-foreground"
      }
    >
      {label}
    </span>
  )
}

function chromeLabel(readiness: CrmReadiness): string {
  if (!readiness.chromeCdpConfigured) return "Chrome CDP: não configurado"
  if (readiness.chromeCdpReachable) return "Chrome CDP: alcançável"
  return "Chrome CDP: fora do ar"
}

export function ReadinessStrip({ readiness }: ReadinessStripProps) {
  const workerLabel = readiness.workerPaused
    ? `Worker: pausado (${pauseReasonLabel(readiness.pauseReason)})`
    : "Worker: em execução"
  return (
    <section
      className="rounded-xl border border-border bg-card px-4 py-3"
      aria-label="Prontidão do operador"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prontidão</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Só mostra se está configurado. Nenhum segredo aparece aqui. Chrome do operador: SETUP.md seção 7 (Linux).
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        <Chip
          ok={readiness.supabaseConfigured}
          label={readiness.supabaseConfigured ? "Supabase: configurado" : "Supabase: memória local"}
        />
        <Chip
          ok={readiness.openaiKeyPresent}
          label={readiness.openaiKeyPresent ? "OpenAI: chave presente" : "OpenAI: heurística"}
        />
        <Chip
          ok={readiness.instagramAppSecretPresent}
          label={readiness.instagramAppSecretPresent ? "Meta secret: presente" : "Meta secret: stub"}
        />
        <Chip
          ok={readiness.instagramPageTokenPresent}
          label={readiness.instagramPageTokenPresent ? "Token da página: presente" : "Token da página: stub"}
        />
        <Chip
          ok={readiness.instagramLiveSend}
          label={readiness.instagramLiveSend ? "Live send: ligado" : "Live send: desligado"}
        />
        <Chip ok={readiness.chromeCdpReachable} label={chromeLabel(readiness)} />
        <Chip ok={!readiness.workerPaused} label={workerLabel} />
        <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
          Webhook: {readiness.webhookPath} ({readiness.webhookUrlHint})
        </span>
      </div>
    </section>
  )
}
