import { SystemStateModel } from '@/models/SystemStateModel'
import { logEvent } from '@/observability/logger'

export type CircuitKind = 'restriction' | 'error' | 'opt_out'

interface CircuitHit {
  kind: CircuitKind
  at: number
}

const WINDOW_MS = 60 * 60 * 1000
const hits: CircuitHit[] = []

const THRESHOLDS: Record<CircuitKind, number> = {
  restriction: 1,
  error: 5,
  opt_out: 3,
}

const REASONS: Record<CircuitKind, string> = {
  restriction: 'instagram_restriction',
  error: 'error_spike',
  opt_out: 'opt_out_spike',
}

function prune(now: number): void {
  while (hits[0] && now - hits[0].at > WINDOW_MS) hits.shift()
}

export function resetCircuitBreaker(): void {
  hits.length = 0
}

export function circuitCounts(now = Date.now()): Record<CircuitKind, number> {
  prune(now)
  return {
    restriction: hits.filter((hit) => hit.kind === 'restriction').length,
    error: hits.filter((hit) => hit.kind === 'error').length,
    opt_out: hits.filter((hit) => hit.kind === 'opt_out').length,
  }
}

export async function recordCircuitEvent(kind: CircuitKind, now = Date.now()): Promise<boolean> {
  prune(now)
  hits.push({ kind, at: now })
  const count = hits.filter((hit) => hit.kind === kind).length
  if (count < THRESHOLDS[kind]) return false
  const reason = REASONS[kind]
  logEvent('circuit_breaker_open', { kind, count, reason })
  await SystemStateModel.setPaused(true, reason)
  return true
}
