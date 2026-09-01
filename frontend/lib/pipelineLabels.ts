import type { ChannelState, ClientPipelineState } from "@/types/crm"

export const PIPELINE_LABELS: Record<ClientPipelineState, string> = {
  discovered: "Descoberto",
  qualified: "Qualificado",
  contacted: "Abordado",
  replied: "Respondeu",
  interested: "Interessado",
  whatsapp_handoff: "Encaminhado ao WhatsApp",
  registered: "Cadastrado",
  active_customer: "Cliente ativo",
  closed: "Encerrado",
}

export const CHANNEL_LABELS: Record<ChannelState, string> = {
  browser_contact_pending: "Canal: pendente",
  browser_contact_sent: "Canal: enviado",
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
  return PIPELINE_LABELS[state as ClientPipelineState] ?? state
}

export function channelLabel(state: string): string {
  return CHANNEL_LABELS[state as ChannelState] ?? state
}
