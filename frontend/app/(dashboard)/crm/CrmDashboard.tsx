"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Pause, Play, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { crmService } from "@/services/crmService"
import { ApiRequestError } from "@/services/apiErrors"
import { channelLabel, formatUsd, pipelineLabel } from "@/lib/pipelineLabels"
import { AFFILIATE_COLUMNS, CUSTOMER_COLUMNS, type CrmMetrics, type Funnel, type JobSummary, type Lead, type SystemState } from "@/types/crm"

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link
      href={`/crm/leads/${lead.id}`}
      className="block rounded-lg border border-border bg-background p-3 shadow-sm transition-colors hover:border-foreground/20"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{lead.displayName ?? `@${lead.instagramHandle}`}</p>
          <p className="truncate text-xs text-muted-foreground">@{lead.instagramHandle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums">
          {lead.score}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{lead.bio ?? "Sem bio pública"}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">{channelLabel(lead.channelState)}</p>
    </Link>
  )
}

export function CrmDashboard() {
  const [funnel, setFunnel] = useState<Funnel>("customer")
  const [columns, setColumns] = useState<Record<string, Lead[]>>({})
  const [metrics, setMetrics] = useState<CrmMetrics | null>(null)
  const [status, setStatus] = useState<SystemState | null>(null)
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pausing, setPausing] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [board, nextMetrics, nextStatus, nextJobs] = await Promise.all([
          crmService.getBoard(funnel),
          crmService.getMetrics(),
          crmService.getStatus(),
          crmService.getJobs(),
        ])
        if (cancelled) return
        setColumns(board.columns)
        setMetrics(nextMetrics)
        setStatus(nextStatus)
        setJobs(nextJobs.jobs)
        setError(null)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof ApiRequestError ? err.message : "Não foi possível carregar o CRM"
        setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [funnel, reloadKey])

  async function togglePause() {
    if (!status) return
    setPausing(true)
    try {
      const next = await crmService.setPaused(!status.paused, status.paused ? undefined : "manual")
      setStatus(next)
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Falha ao pausar"
      setError(message)
    } finally {
      setPausing(false)
    }
  }

  return (
    <CrmBoardView
      funnel={funnel}
      columns={columns}
      metrics={metrics}
      status={status}
      jobs={jobs}
      error={error}
      loading={loading}
      pausing={pausing}
      onFunnelChange={setFunnel}
      onRefresh={() => {
        setLoading(true)
        setReloadKey((key) => key + 1)
      }}
      onTogglePause={() => void togglePause()}
    />
  )
}

export type CrmBoardViewProps = {
  funnel: Funnel
  columns: Record<string, Lead[]>
  metrics: CrmMetrics | null
  status: SystemState | null
  jobs: JobSummary[]
  error: string | null
  loading: boolean
  pausing: boolean
  onFunnelChange: (funnel: Funnel) => void
  onRefresh: () => void
  onTogglePause: () => void
}

export function CrmBoardView({
  funnel,
  columns,
  metrics,
  status,
  jobs,
  error,
  loading,
  pausing,
  onFunnelChange,
  onRefresh,
  onTogglePause,
}: CrmBoardViewProps) {
  const order = funnel === "affiliate" ? AFFILIATE_COLUMNS : CUSTOMER_COLUMNS

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM comercial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prospecção no Instagram — pipeline e canal são campos separados. Conversas pessoais ficam fora desta fila.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className="size-4" />
            Atualizar
          </Button>
          <Button
            variant={status?.paused ? "default" : "destructive"}
            size="sm"
            onClick={onTogglePause}
            disabled={!status || pausing}
          >
            {status?.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {status?.paused ? "Retomar sistema" : "Pausar sistema"}
          </Button>
        </div>
      </div>

      {status?.paused && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Sistema pausado{status.pauseReason ? `: ${status.pauseReason}` : ""}. O worker não envia DMs até você retomar.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Custo de IA / lead"
          value={formatUsd(metrics?.costPerLeadUsd ?? null)}
          hint="Placeholder até haver gasto real no mês"
        />
        <MetricCard
          label="Custo de IA / cliente ativo"
          value={formatUsd(metrics?.costPerActiveCustomerUsd ?? null)}
          hint="Sem cliente ativo o valor fica em branco"
        />
        <MetricCard
          label="Gasto no mês"
          value={formatUsd(metrics?.monthlySpendUsd ?? 0)}
          hint={`Orçamento: ${formatUsd(metrics?.monthlyBudgetUsd ?? null)}`}
        />
        <MetricCard
          label="Leads no funil"
          value={String(metrics?.leadCount ?? 0)}
          hint={`${metrics?.activeCustomerCount ?? 0} cliente(s) ativo(s)`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={funnel === "customer" ? "default" : "outline"} size="sm" onClick={() => onFunnelChange("customer")}>
          Clientes
        </Button>
        <Button variant={funnel === "affiliate" ? "default" : "outline"} size="sm" onClick={() => onFunnelChange("affiliate")}>
          Afiliados
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {order.map((state) => {
          const cards = columns[state] ?? []
          return (
            <section
              key={state}
              className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-muted/40"
              aria-label={pipelineLabel(state)}
            >
              <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <h2 className="text-sm font-medium">{pipelineLabel(state)}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">{cards.length}</span>
              </header>
              <div className="flex flex-col gap-2 p-2">
                {cards.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nenhum lead</p>
                )}
                {cards.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Fila de jobs</h2>
        {jobs.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum job na fila.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border text-sm">
            {jobs.slice(0, 8).map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-medium">{job.type}</span>
                <span className="text-muted-foreground">{job.status}</span>
                <span className="text-xs text-muted-foreground">{new Date(job.runAt).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
