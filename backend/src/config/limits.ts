export interface AgentLimits {
  maxDmsPerDay: number
  minSecondsBetweenDms: number
  maxSecondsBetweenDms: number
  operatingHours: string
  operatingTimezone: string
  openaiMonthlyBudgetUsd: number
  workerPollMs: number
  browserMode: 'simulated' | 'dry-run' | 'live'
}

function num(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

export function loadAgentLimits(): AgentLimits {
  const mode = process.env['BROWSER_MODE']
  const browserMode: AgentLimits['browserMode'] =
    mode === 'dry-run' || mode === 'live' ? mode : 'simulated'
  return {
    maxDmsPerDay: num('MAX_DMS_PER_DAY', 30),
    minSecondsBetweenDms: num('MIN_SECONDS_BETWEEN_DMS', 90),
    maxSecondsBetweenDms: num('MAX_SECONDS_BETWEEN_DMS', 240),
    operatingHours: process.env['OPERATING_HOURS'] ?? '09:00-20:00',
    operatingTimezone: process.env['OPERATING_TIMEZONE'] ?? 'America/Sao_Paulo',
    openaiMonthlyBudgetUsd: num('OPENAI_MONTHLY_BUDGET_USD', 50),
    workerPollMs: num('WORKER_POLL_MS', 2000),
    browserMode,
  }
}
