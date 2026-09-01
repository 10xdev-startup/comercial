"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { crmService } from "@/services/crmService"
import { ApiRequestError } from "@/services/apiErrors"
import { channelLabel, pipelineLabel } from "@/lib/pipelineLabels"
import { CLIENT_PIPELINE_ORDER, type LeadDetailResponse, type PublicCrmConfig, type SystemState } from "@/types/crm"

export type FirstContactActionsProps = {
  paused: boolean
  pauseReason: string | null
  canEnqueue: boolean
  enqueueing: boolean
  liveSend: boolean
  onEnqueue: () => void
}

export function FirstContactActions({
  paused,
  pauseReason,
  canEnqueue,
  enqueueing,
  liveSend,
  onEnqueue,
}: FirstContactActionsProps) {
  const disabled = paused || !canEnqueue || enqueueing
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
      <Button type="button" size="sm" disabled={disabled} onClick={onEnqueue}>
        Enfileirar primeiro contato
      </Button>
      {paused ? (
        <p className="text-xs text-muted-foreground">
          Sistema pausado{pauseReason ? ` (${pauseReason})` : ""}. Retome no painel para enfileirar.
        </p>
      ) : liveSend ? (
        <p className="text-xs text-muted-foreground">
          INSTAGRAM_LIVE_SEND está ligado. Só clique se o Chrome do operador estiver aberto em 127.0.0.1.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Dry-run: o worker não clica em Enviar no Instagram, a menos que você ligue INSTAGRAM_LIVE_SEND=true
          no Chrome do operador (veja SETUP.md).
        </p>
      )}
    </div>
  )
}

export function LeadDetail() {
  const params = useParams<{ id: string }>()
  const leadId = typeof params.id === "string" ? params.id : ""
  const [data, setData] = useState<LeadDetailResponse | null>(null)
  const [config, setConfig] = useState<PublicCrmConfig | null>(null)
  const [status, setStatus] = useState<SystemState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [enqueueing, setEnqueueing] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!leadId) return
    let active = true
    void Promise.all([crmService.getLead(leadId), crmService.getConfig(), crmService.getStatus()]).then(
      ([detail, nextConfig, nextStatus]) => {
        if (!active) return
        setData(detail)
        setConfig(nextConfig)
        setStatus(nextStatus)
        setError(null)
      },
      (err: unknown) => {
        if (!active) return
        setError(err instanceof ApiRequestError ? err.message : "Não foi possível carregar o lead")
      },
    )
    return () => {
      active = false
    }
  }, [leadId, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  if (error && !data) {
    return (
      <div className="space-y-3">
        <Link href="/crm" className="text-sm text-muted-foreground hover:underline">← Voltar ao CRM</Link>
        <p className="text-sm text-destructive" role="alert">{error}</p>
      </div>
    )
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Carregando lead…</p>
  }

  const { lead, messages, conversation } = data

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/crm" className="text-sm text-muted-foreground hover:underline">← Voltar ao CRM</Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{lead.displayName ?? `@${lead.instagramHandle}`}</h1>
        <p className="text-sm text-muted-foreground">@{lead.instagramHandle}</p>
        {lead.bio && <p className="text-sm">{lead.bio}</p>}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-2 py-1">{pipelineLabel(lead.pipelineState)}</span>
          <span className="rounded-full bg-muted px-2 py-1">{channelLabel(lead.channelState)}</span>
          <span className="rounded-full bg-muted px-2 py-1">Canal dono: {conversation.channelOwner}</span>
          {conversation.messagingWindowExpiresAt && (
            <span className="rounded-full bg-muted px-2 py-1">
              Janela API até {new Date(conversation.messagingWindowExpiresAt).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline" size="sm">
            <a href={`https://www.instagram.com/${lead.instagramHandle}/`} target="_blank" rel="noreferrer">
              Abrir Instagram
            </a>
          </Button>
          {config && (
            <Button asChild size="sm">
              <a href={config.whatsappLink} target="_blank" rel="noreferrer">
                Encaminhar ao WhatsApp
              </a>
            </Button>
          )}
        </div>
        <FirstContactActions
          paused={status?.paused === true}
          pauseReason={status?.pauseReason ?? null}
          canEnqueue={
            lead.channelState === "browser_contact_pending" && conversation.channelOwner !== "api"
          }
          enqueueing={enqueueing}
          liveSend={config?.instagramLiveSend === true}
          onEnqueue={() => {
            setEnqueueing(true)
            void crmService.enqueueFirstContact(lead.id).then(
              () => {
                setEnqueueing(false)
                reload()
              },
              (err: unknown) => {
                setError(err instanceof ApiRequestError ? err.message : "Falha ao enfileirar o primeiro contato")
                setEnqueueing(false)
              },
            )
          }}
        />
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Etapa do funil</h2>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={lead.pipelineState}
          disabled={saving}
          onChange={(event) => {
            const pipelineState = event.target.value as typeof lead.pipelineState
            setSaving(true)
            void crmService.updateLead(lead.id, { pipelineState }).then(
              () => {
                setSaving(false)
                reload()
              },
              (err: unknown) => {
                setError(err instanceof ApiRequestError ? err.message : "Falha ao mover o lead")
                setSaving(false)
              },
            )
          }}
        >
          {CLIENT_PIPELINE_ORDER.map((state) => (
            <option key={state} value={state}>{pipelineLabel(state)}</option>
          ))}
        </select>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Linha do tempo</h2>
        {messages.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {messages.map((message) => (
              <li key={message.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {message.direction === "outbound" ? "Enviada" : "Recebida"} · {message.source}
                  </span>
                  <time dateTime={message.createdAt}>
                    {new Date(message.createdAt).toLocaleString("pt-BR")}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{message.body}</p>
              </li>
            ))}
          </ol>
        )}
        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!note.trim()) return
            setSaving(true)
            void crmService.addNote(lead.id, note.trim()).then(
              () => {
                setNote("")
                setSaving(false)
                reload()
              },
              (err: unknown) => {
                setError(err instanceof ApiRequestError ? err.message : "Falha ao registrar nota")
                setSaving(false)
              },
            )
          }}
        >
          <label className="text-xs font-medium text-muted-foreground">
            Nova nota na timeline
            <Input className="mt-1" value={note} onChange={(event) => setNote(event.target.value)} placeholder="O que aconteceu com este lead?" />
          </label>
          <Button type="submit" size="sm" disabled={saving || !note.trim()}>
            Enfileirar nota
          </Button>
        </form>
      </section>
    </div>
  )
}
