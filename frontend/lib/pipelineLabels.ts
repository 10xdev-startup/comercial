import type { ChannelState, PipelineState } from "@/types/crm"

export const PIPELINE_LABELS: Record<PipelineState, string> = {
  discovered: "Descoberto",
  qualified: "Qualificado",
  contacted: "Abordado",
  replied: "Respondeu",
  interested: "Interessado",
  whatsapp_handoff: "Encaminhado ao WhatsApp",
  registered: "Cadastrado",
  active_customer: "Cliente ativo",
  joined_affiliate_group: "Entrou no grupo",
  active_affiliate: "Afiliado ativo",
  generated_customer: "Gerou cliente",
  closed: "Encerrado",
}

export const CHANNEL_LABELS: Record<ChannelState, string> = {
  browser_contact_pending: "Navegador: pendente",
  browser_contact_sent: "Navegador: enviado",
  waiting_inbound_reply: "Aguardando resposta",
  api_eligible: "API elegível",
  api_active: "API ativa",
  api_window_closed: "Janela da API fechada",
  human_review_required: "Revisão humana",
  do_not_contact: "Não contatar",
  blocked: "Bloqueado",
  completed: "Concluído",
}

export function pipelineLabel(state: string): string {
  return PIPELINE_LABELS[state as PipelineState] ?? state
}

export function channelLabel(state: string): string {
  return CHANNEL_LABELS[state as ChannelState] ?? state
}

export function formatUsd(value: number | null): string {
  if (value === null) return "—"
  return value.toLocaleString("pt-BR", { style: "currency", currency: "USD" })
}
