export function pauseReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "Pausa sem motivo registrado"
  switch (reason) {
    case "manual":
      return "Pausa manual"
    case "openai_budget":
      return "Orçamento da OpenAI no mês atingido"
    case "instagram_restriction":
      return "Restrição ou checkpoint do Instagram"
    case "error_spike":
      return "Pico de erros (circuit breaker)"
    case "opt_out_spike":
      return "Pico de pedidos de opt-out"
    case "browser_unavailable":
      return "Chrome do operador indisponível"
    default:
      return reason
  }
}

export function pausedSystemCopy(reason: string | null | undefined): string {
  if (!reason) return "Sistema pausado. Retome no painel para enfileirar."
  return `Sistema pausado (${pauseReasonLabel(reason)}). Retome no painel para enfileirar.`
}
