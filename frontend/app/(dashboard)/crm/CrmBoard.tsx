"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Pause, Play, Plus, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/showcase/blocks/EmptyState"
import { crmService } from "@/services/crmService"
import { ApiRequestError } from "@/services/apiErrors"
import { channelLabel, pipelineLabel } from "@/lib/pipelineLabels"
import { pauseReasonLabel } from "@/lib/pauseReasons"
import {
  CLIENT_PIPELINE_ORDER,
  type BoardResponse,
  type ExperimentSummary,
  type JobSummary,
  type Lead,
  type SystemState,
} from "@/types/crm"

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

export type CreateExperimentInput = {
  name: string
  hypothesis: string
  variant: string
  sampleSize: number
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
  discovering: boolean
  creatingExperiment?: boolean
  declaringWinnerId?: string | null
  onRefresh: () => void
  onTogglePause: () => void
  onCreateLead: (input: { instagramHandle: string; displayName: string }) => void
  onDiscoverLeads: () => void
  onCreateExperiment?: (input: CreateExperimentInput) => void
  onDeclareWinner?: (id: string, winner: string) => void
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
  discovering,
  creatingExperiment = false,
  declaringWinnerId = null,
  onRefresh,
  onTogglePause,
  onCreateLead,
  onDiscoverLeads,
  onCreateExperiment,
  onDeclareWinner,
}: CrmBoardViewProps) {
  const [handle, setHandle] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [experimentName, setExperimentName] = useState("")
  const [hypothesis, setHypothesis] = useState("")
  const [variant, setVariant] = useState("")
  const [sampleSize, setSampleSize] = useState("20")
  const totalLeads = metrics?.leadCount ?? 0
  const paused = status?.paused === true
  const pauseLabel = paused ? pauseReasonLabel(status?.pauseReason) : null

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={paused || discovering || loading}
            onClick={onDiscoverLeads}
          >
            <Search className="size-4" />
            Descobrir leads simulados
          </Button>
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

      {paused && (
        <div
          className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-semibold text-destructive">Sistema pausado</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{pauseLabel}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        A descoberta simulada usa o ICP do arquivo de negócio e não abre o Instagram.
        O primeiro contato em dry-run não clica em Enviar, a menos que INSTAGRAM_LIVE_SEND esteja ligado.
      </p>

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
          {pauseLabel && (
            <p className="mt-1 text-xs text-muted-foreground">{pauseLabel}</p>
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

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Experimentos (uma variável por vez)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Compare exatamente uma variante contra o controle. O CRM recusa vencedor se a amostra for menor que sample_size.
        </p>
        {onCreateExperiment && (
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const size = Number.parseInt(sampleSize, 10)
              if (!experimentName.trim() || !hypothesis.trim() || !variant.trim() || !Number.isInteger(size) || size < 1) {
                return
              }
              onCreateExperiment({
                name: experimentName.trim(),
                hypothesis: hypothesis.trim(),
                variant: variant.trim(),
                sampleSize: size,
              })
              setExperimentName("")
              setHypothesis("")
              setVariant("")
              setSampleSize("20")
            }}
          >
            <label className="min-w-36 flex-1 text-xs font-medium text-muted-foreground">
              Nome
              <Input
                className="mt-1"
                value={experimentName}
                onChange={(event) => setExperimentName(event.target.value)}
                placeholder="CTA WhatsApp"
              />
            </label>
            <label className="min-w-40 flex-1 text-xs font-medium text-muted-foreground">
              Hipótese
              <Input
                className="mt-1"
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
                placeholder="zap no primeiro reply converte mais"
              />
            </label>
            <label className="min-w-32 flex-1 text-xs font-medium text-muted-foreground">
              Variante (vs controle)
              <Input
                className="mt-1"
                value={variant}
                onChange={(event) => setVariant(event.target.value)}
                placeholder="wa-first"
              />
            </label>
            <label className="w-28 text-xs font-medium text-muted-foreground">
              Amostra
              <Input
                className="mt-1"
                type="number"
                min={1}
                value={sampleSize}
                onChange={(event) => setSampleSize(event.target.value)}
              />
            </label>
            <Button
              type="submit"
              size="sm"
              disabled={
                creatingExperiment ||
                !experimentName.trim() ||
                !hypothesis.trim() ||
                !variant.trim()
              }
            >
              Criar experimento
            </Button>
          </form>
        )}
        {experiments.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">Nenhum experimento ainda.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {experiments.map((experiment) => {
              const variantName = experiment.variants[0] ?? "variante"
              const canDeclare = experiment.status !== "concluded" && Boolean(onDeclareWinner)
              return (
                <li key={experiment.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{experiment.name}</p>
                  <p className="text-xs text-muted-foreground">{experiment.hypothesis}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {experiment.controlVariant} vs {variantName} · {experiment.status} · amostra {experiment.assignedCount}/{experiment.sampleSize}
                    {experiment.winner ? ` · vencedor ${experiment.winner}` : " · sem vencedor precoce"}
                  </p>
                  {canDeclare && onDeclareWinner && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={declaringWinnerId === experiment.id}
                        onClick={() => onDeclareWinner(experiment.id, experiment.controlVariant)}
                      >
                        Declarar {experiment.controlVariant}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={declaringWinnerId === experiment.id}
                        onClick={() => onDeclareWinner(experiment.id, variantName)}
                      >
                        Declarar {variantName}
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

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
  const [discovering, setDiscovering] = useState(false)
  const [creatingExperiment, setCreatingExperiment] = useState(false)
  const [declaringWinnerId, setDeclaringWinnerId] = useState<string | null>(null)
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

  const onDiscoverLeads = useCallback(() => {
    if (status?.paused) return
    setDiscovering(true)
    void crmService.enqueueDiscover().then(
      () => {
        setDiscovering(false)
        setLoading(true)
        setReloadKey((key) => key + 1)
      },
      (err: unknown) => {
        setError(err instanceof ApiRequestError ? err.message : "Falha ao descobrir leads")
        setDiscovering(false)
      },
    )
  }, [status])

  const onCreateExperiment = useCallback((input: CreateExperimentInput) => {
    setCreatingExperiment(true)
    void crmService
      .createExperiment({
        name: input.name,
        hypothesis: input.hypothesis,
        variants: [input.variant],
        sampleSize: input.sampleSize,
      })
      .then(
        () => {
          setCreatingExperiment(false)
          setLoading(true)
          setReloadKey((key) => key + 1)
        },
        (err: unknown) => {
          setError(err instanceof ApiRequestError ? err.message : "Falha ao criar experimento")
          setCreatingExperiment(false)
        },
      )
  }, [])

  const onDeclareWinner = useCallback((id: string, winner: string) => {
    setDeclaringWinnerId(id)
    void crmService.declareWinner(id, winner).then(
      () => {
        setDeclaringWinnerId(null)
        setLoading(true)
        setReloadKey((key) => key + 1)
      },
      (err: unknown) => {
        let message = "Falha ao declarar vencedor"
        if (err instanceof ApiRequestError) {
          message = err.code === "SAMPLE_TOO_SMALL"
            ? "Amostra insuficiente para declarar vencedor"
            : err.message
        }
        setError(message)
        setDeclaringWinnerId(null)
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
      discovering={discovering}
      creatingExperiment={creatingExperiment}
      declaringWinnerId={declaringWinnerId}
      onRefresh={onRefresh}
      onTogglePause={onTogglePause}
      onCreateLead={onCreateLead}
      onDiscoverLeads={onDiscoverLeads}
      onCreateExperiment={onCreateExperiment}
      onDeclareWinner={onDeclareWinner}
    />
  )
}
