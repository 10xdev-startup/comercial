import type { ClientPipelineState } from '@/types/crm'

const TRANSITIONS: Record<ClientPipelineState, ClientPipelineState[]> = {
  discovered: ['qualified', 'contacted', 'closed'],
  qualified: ['contacted', 'closed'],
  contacted: ['replied', 'closed'],
  replied: ['interested', 'closed'],
  interested: ['whatsapp_handoff', 'closed'],
  whatsapp_handoff: ['registered', 'closed'],
  registered: ['active_customer', 'closed'],
  active_customer: ['closed'],
  closed: [],
}

export function canTransitionPipeline(from: ClientPipelineState, to: ClientPipelineState): boolean {
  if (from === to) return true
  return TRANSITIONS[from].includes(to)
}

export function assertPipelineTransition(from: ClientPipelineState, to: ClientPipelineState): void {
  if (!canTransitionPipeline(from, to)) {
    throw new Error(`Invalid client pipeline transition: ${from} -> ${to}`)
  }
}

export function isClientPipelineState(value: unknown): value is ClientPipelineState {
  return (
    value === 'discovered' ||
    value === 'qualified' ||
    value === 'contacted' ||
    value === 'replied' ||
    value === 'interested' ||
    value === 'whatsapp_handoff' ||
    value === 'registered' ||
    value === 'active_customer' ||
    value === 'closed'
  )
}
