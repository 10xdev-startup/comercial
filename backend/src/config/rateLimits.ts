export interface OperatingHours {
  startMinutes: number
  endMinutes: number
}

export interface RateLimitConfig {
  maxDmsPerDay: number
  minSecondsBetweenDms: number
  maxSecondsBetweenDms: number
  operatingHours: OperatingHours
  timeZone: string
}

const DEFAULT_HOURS: OperatingHours = { startMinutes: 9 * 60, endMinutes: 20 * 60 }

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function envText(name: string, fallback: string): string {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  return raw.trim()
}

export function parseOperatingHours(raw: string | undefined): OperatingHours {
  if (!raw || !raw.trim()) return { ...DEFAULT_HOURS }
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(raw.trim())
  if (!match) return { ...DEFAULT_HOURS }
  const startH = Number(match[1])
  const startM = Number(match[2])
  const endH = Number(match[3])
  const endM = Number(match[4])
  if ([startH, startM, endH, endM].some((part) => !Number.isFinite(part))) return { ...DEFAULT_HOURS }
  if (startH > 23 || startM > 59 || endM > 59 || endH > 24) return { ...DEFAULT_HOURS }
  if (endH === 24 && endM !== 0) return { ...DEFAULT_HOURS }
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  if (endMinutes <= startMinutes) return { ...DEFAULT_HOURS }
  return { startMinutes, endMinutes }
}

export function loadRateLimits(): RateLimitConfig {
  const minSeconds = envInt('MIN_SECONDS_BETWEEN_DMS', 90)
  const maxSeconds = envInt('MAX_SECONDS_BETWEEN_DMS', 240)
  return {
    maxDmsPerDay: envInt('MAX_DMS_PER_DAY', 30),
    minSecondsBetweenDms: minSeconds,
    maxSecondsBetweenDms: Math.max(maxSeconds, minSeconds),
    operatingHours: parseOperatingHours(process.env['OPERATING_HOURS']),
    timeZone: envText('OPERATING_TIMEZONE', 'America/Sao_Paulo'),
  }
}
