"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Pause, Play, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/showcase/blocks/EmptyState"
import { crmService } from "@/services/crmService"
import { ApiRequestError } from "@/services/apiErrors"
import { channelLabel, pipelineLabel } from "@/lib/pipelineLabels"
import { CLIENT_PIPELINE_ORDER, type BoardResponse, type ExperimentSummary, type JobSummary, type Lead, type SystemState } from "@/types/crm"

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link
      href={`/crm/leads/${lead.id}`}
      className="block rounded-lg border border-border bg-background p-3 shadow-sm transition-colors hover:border-foreground/20"
    >
      <p className="truncate text-sm font-medium">{lead.displayName ?? `@${lead.instagramHandle}`}</p>
      <p className="truncate text-xs text-muted-foreground">@{lead.instagramHandle}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">{channelLabel(lead.channelState)}</p>
    </Link>
  )
}

export type CrmBoardViewProps = {
  columns: Record<string, Lead[]>
  metrics: BoardResponse["metrics"] | null
  status: SystemState | null
  jobs: JobSummary[]
  experiments: ExperimentSummary[]
  error: string | null
  loading: boolean
  pausing: boolean
  creating: boolean
  onRefresh: () => void
  onTogglePause: () => void
  onCreateLead: (input: { instagramHandle: string; displayName: string }) => void
}

export function CrmBoardView({
  columns,
  metrics,
  status,
  jobs,
  experiments,
  error,
  loading,
  pausing,
  creating,
  onRefresh,
  onTogglePause,
  onCreateLead,
}: CrmBoardViewProps) {
  const [handle, setHandle] = useState("")
  const [displayName, setDisplayName] = useState("")
  const totalLeads = metrics?.leadCount ?? 0
  const paused = status?.paused === true

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">CRM de clientes</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Funil de clientes da 10xMídia. Pipeline e canal são campos separados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="size-4" />
            Atualizar
          </Button>
          <Button
            type="button"
            variant={paused ? "default" : "destructive"}
            size="sm"
            disabled={!status || pausing}
            onClick={onTogglePause}
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {paused ? "Retomar sistema" : "Pausar sistema"}
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Leads</p>
          <p className="mt-1 text-xl font-semibold">{totalLeads}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Clientes ativos</p>
          <p className="mt-1 text-xl font-semibold">{metrics?.activeCustomerCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Custo de IA no mês</p>
          <p className="mt-1 text-xl font-semibold">
            US$ {(metrics?.aiCostUsdThisMonth ?? 0).toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            US$ {(metrics?.aiCostPerLead ?? 0).toFixed(4)} por lead
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sistema</p>
          <p className="mt-1 text-xl font-semibold">{paused ? "Pausado" : "Em execução"}</p>
          {status?.pauseReason && (
            <p className="mt-1 text-xs text-muted-foreground">{status.pauseReason}</p>
          )}
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-border p-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (!handle.trim()) return
          onCreateLead({ instagramHandle: handle.trim(), displayName: displayName.trim() })
          setHandle("")
          setDisplayName("")
        }}
      >
        <label className="min-w-40 flex-1 text-xs font-medium text-muted-foreground">
          @ do Instagram
          <Input className="mt-1" value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="agencia_exemplo" />
        </label>
        <label className="min-w-40 flex-1 text-xs font-medium text-muted-foreground">
          Nome (opcional)
          <Input className="mt-1" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Agência Exemplo" />
        </label>
        <Button type="submit" size="sm" disabled={creating || !handle.trim()}>
          <Plus className="size-4" />
          Novo lead
        </Button>
      </form>

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando CRM…</p>
      ) : totalLeads === 0 ? (
        <EmptyState
          title="Nenhum lead ainda"
          description="Cadastre um perfil para ver o kanban do funil de clientes."
        />
      ) : (
        <div className="flex min-h-[28rem] gap-3 overflow-x-auto pb-2">
          {CLIENT_PIPELINE_ORDER.map((state) => {
            const items = columns[state] ?? []
            return (
              <section
                key={state}
                className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-muted/40"
              >
                <header className="flex items-center justify-between gap-2 px-3 py-2">
                  <h2 className="text-sm font-semibold">{pipelineLabel(state)}</h2>
                  <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
                </header>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                  {items.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {experiments.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Experimentos (uma variável por vez)</h2>
          <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
            {experiments.map((experiment) => (
              <li key={experiment.id}>
                {experiment.name} · {experiment.status} · amostra {experiment.assignedCount}/{experiment.sampleSize}
                {experiment.winner ? ` · vencedor ${experiment.winner}` : " · sem vencedor precoce"}
              </li>
            ))}
          </ul>
        </section>
      )}

      {jobs.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Fila de jobs</h2>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {jobs.slice(0, 8).map((job) => (
              <li key={job.id}>
                {job.type} · {job.status}
                {job.lastError ? ` · ${job.lastError}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export function CrmBoard() {
  const [columns, setColumns] = useState<Record<string, Lead[]>>({})
  const [metrics, setMetrics] = useState<BoardResponse["metrics"] | null>(null)
  const [status, setStatus] = useState<SystemState | null>(null)
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pausing, setPausing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    void Promise.all([
      crmService.getBoard(),
      crmService.getStatus(),
      crmService.getJobs(),
      crmService.getExperiments(),
    ]).then(
      ([board, nextStatus, nextJobs, nextExperiments]) => {
        if (!active) return
        setColumns(board.columns)
        setMetrics(board.metrics)
        setStatus(nextStatus)
        setJobs(nextJobs.jobs)
        setExperiments(nextExperiments.experiments)
        setError(null)
        setLoading(false)
      },
      (err: unknown) => {
        if (!active) return
        setError(err instanceof ApiRequestError ? err.message : "Não foi possível carregar o CRM")
        setLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [reloadKey])

  const onRefresh = useCallback(() => {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }, [])

  const onTogglePause = useCallback(() => {
    if (!status) return
    setPausing(true)
    const nextPaused = !status.paused
    void crmService.setPaused(nextPaused, nextPaused ? "manual" : undefined).then(
      (next) => {
        setStatus(next)
        setPausing(false)
      },
      (err: unknown) => {
        setError(err instanceof ApiRequestError ? err.message : "Falha ao pausar")
        setPausing(false)
      },
    )
  }, [status])

  const onCreateLead = useCallback((input: { instagramHandle: string; displayName: string }) => {
    setCreating(true)
    const payload: { instagramHandle: string; displayName?: string } = {
      instagramHandle: input.instagramHandle,
    }
    if (input.displayName) payload.displayName = input.displayName
    void crmService.createLead(payload).then(
      () => {
        setCreating(false)
        setLoading(true)
        setReloadKey((key) => key + 1)
      },
      (err: unknown) => {
        setError(err instanceof ApiRequestError ? err.message : "Falha ao criar lead")
        setCreating(false)
      },
    )
  }, [])

  return (
    <CrmBoardView
      columns={columns}
      metrics={metrics}
      status={status}
      jobs={jobs}
      experiments={experiments}
      error={error}
      loading={loading}
      pausing={pausing}
      creating={creating}
      onRefresh={onRefresh}
      onTogglePause={onTogglePause}
      onCreateLead={onCreateLead}
    />
  )
}
