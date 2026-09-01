"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { crmService } from "@/services/crmService"
import { ApiRequestError } from "@/services/apiErrors"
import { channelLabel, pipelineLabel } from "@/lib/pipelineLabels"
import type { LeadDetailResponse } from "@/types/crm"

export function LeadDetail() {
  const params = useParams<{ id: string }>()
  const leadId = params.id
  const [data, setData] = useState<LeadDetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enqueueing, setEnqueueing] = useState(false)

  useEffect(() => {
    if (!leadId) return
    void crmService
      .getLead(leadId)
      .then(setData)
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "Não foi possível carregar o lead")
      })
  }, [leadId])

  async function enqueueFirstDm() {
    if (!leadId) return
    setEnqueueing(true)
    try {
      await crmService.enqueueFirstDm(leadId)
      const next = await crmService.getLead(leadId)
      setData(next)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Falha ao enfileirar a primeira DM")
    } finally {
      setEnqueueing(false)
    }
  }

  if (error && !data) {
    return (
      <div className="space-y-3">
        <Link href="/crm" className="text-sm text-muted-foreground hover:underline">
          ← Voltar ao CRM
        </Link>
        <p className="text-sm text-destructive" role="alert">{error}</p>
      </div>
    )
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Carregando lead…</p>
  }

  const { lead, messages, conversation } = data
  const instagramHref = `https://www.instagram.com/${lead.instagramHandle}/`

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/crm" className="text-sm text-muted-foreground hover:underline">
        ← Voltar ao CRM
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{lead.displayName ?? `@${lead.instagramHandle}`}</h1>
        <p className="text-sm text-muted-foreground">@{lead.instagramHandle}</p>
        {lead.bio && <p className="text-sm">{lead.bio}</p>}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-2 py-1">{pipelineLabel(lead.pipelineState)}</span>
          <span className="rounded-full bg-muted px-2 py-1">{channelLabel(lead.channelState)}</span>
          <span className="rounded-full bg-muted px-2 py-1">Score {lead.score}</span>
          <span className="rounded-full bg-muted px-2 py-1">Canal dono: {conversation.channelOwner}</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline" size="sm">
            <a href={instagramHref} target="_blank" rel="noreferrer">Abrir Instagram</a>
          </Button>
          <Button size="sm" onClick={() => void enqueueFirstDm()} disabled={enqueueing}>
            Enfileirar 1ª DM
          </Button>
        </div>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

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
                    {message.variant ? ` · variante ${message.variant}` : ""}
                  </span>
                  <time dateTime={message.createdAt}>
                    {new Date(message.createdAt).toLocaleString("pt-BR")}
                  </time>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{message.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
