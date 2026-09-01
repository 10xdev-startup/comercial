import type { AffiliatePipelineState, CustomerPipelineState, Funnel, PipelineState } from '@/types/crm'

const CUSTOMER_TRANSITIONS: Record<CustomerPipelineState, CustomerPipelineState[]> = {
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

const AFFILIATE_TRANSITIONS: Record<AffiliatePipelineState, AffiliatePipelineState[]> = {
  discovered: ['qualified', 'contacted', 'closed'],
  qualified: ['contacted', 'closed'],
  contacted: ['replied', 'closed'],
  replied: ['interested', 'closed'],
  interested: ['joined_affiliate_group', 'closed'],
  joined_affiliate_group: ['active_affiliate', 'closed'],
  active_affiliate: ['generated_customer', 'closed'],
  generated_customer: ['closed'],
  closed: [],
}

export function canTransitionPipeline(
  funnel: Funnel,
  from: PipelineState,
  to: PipelineState,
): boolean {
  if (from === to) return true
  if (funnel === 'customer') {
    const allowed = CUSTOMER_TRANSITIONS[from as CustomerPipelineState]
    return allowed?.includes(to as CustomerPipelineState) === true
  }
  const allowed = AFFILIATE_TRANSITIONS[from as AffiliatePipelineState]
  return allowed?.includes(to as AffiliatePipelineState) === true
}

export function assertPipelineTransition(
  funnel: Funnel,
  from: PipelineState,
  to: PipelineState,
): void {
  if (!canTransitionPipeline(funnel, from, to)) {
    throw new Error(`Invalid pipeline transition (${funnel}): ${from} -> ${to}`)
  }
}
