import type { OperatingHours, RateLimitConfig } from '@/config/rateLimits'

export type DeferReason = 'operating_hours' | 'min_interval' | 'daily_cap'

export interface SendScheduleDecision {
  at: Date
  reason: 'ok' | DeferReason
}

export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const map: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

export function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second)
  const parts = getZonedParts(new Date(utcGuess), timeZone)
  const asIfUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return new Date(utcGuess - (asIfUtc - utcGuess))
}

function addCalendarDays(year: number, month: number, day: number, days: number): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day + days))
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() }
}

export function minutesOfDay(parts: Pick<ZonedParts, 'hour' | 'minute'>): number {
  return parts.hour * 60 + parts.minute
}

export function isWithinOperatingHours(date: Date, timeZone: string, hours: OperatingHours): boolean {
  const minutes = minutesOfDay(getZonedParts(date, timeZone))
  return minutes >= hours.startMinutes && minutes < hours.endMinutes
}

export function startOfZonedDay(date: Date, timeZone: string): Date {
  const parts = getZonedParts(date, timeZone)
  return zonedTimeToUtc(timeZone, parts.year, parts.month, parts.day, 0, 0, 0)
}

function operatingStartOn(date: Date, timeZone: string, hours: OperatingHours): Date {
  const parts = getZonedParts(date, timeZone)
  const startH = Math.floor(hours.startMinutes / 60)
  const startM = hours.startMinutes % 60
  return zonedTimeToUtc(timeZone, parts.year, parts.month, parts.day, startH, startM, 0)
}

export function nextOperatingWindowStart(date: Date, timeZone: string, hours: OperatingHours): Date {
  const parts = getZonedParts(date, timeZone)
  const minutes = minutesOfDay(parts)
  if (minutes < hours.startMinutes) return operatingStartOn(date, timeZone, hours)
  const tomorrow = addCalendarDays(parts.year, parts.month, parts.day, 1)
  const startH = Math.floor(hours.startMinutes / 60)
  const startM = hours.startMinutes % 60
  return zonedTimeToUtc(timeZone, tomorrow.year, tomorrow.month, tomorrow.day, startH, startM, 0)
}

function delayMs(config: RateLimitConfig, random: () => number): number {
  const span = config.maxSecondsBetweenDms - config.minSecondsBetweenDms
  const extra = span <= 0 ? 0 : random() * span
  return Math.round((config.minSecondsBetweenDms + extra) * 1000)
}

export function nextAllowedSendAt(input: {
  now: Date
  lastSendAt: Date | null
  dmsToday: number
  config: RateLimitConfig
  random?: () => number
}): SendScheduleDecision {
  const { now, lastSendAt, dmsToday, config } = input
  const random = input.random ?? Math.random
  const { timeZone, operatingHours } = config

  if (dmsToday >= config.maxDmsPerDay) {
    const parts = getZonedParts(now, timeZone)
    const tomorrow = addCalendarDays(parts.year, parts.month, parts.day, 1)
    const startH = Math.floor(operatingHours.startMinutes / 60)
    const startM = operatingHours.startMinutes % 60
    return {
      at: zonedTimeToUtc(timeZone, tomorrow.year, tomorrow.month, tomorrow.day, startH, startM, 0),
      reason: 'daily_cap',
    }
  }

  let at = now
  let reason: SendScheduleDecision['reason'] = 'ok'

  if (lastSendAt) {
    const earliest = new Date(lastSendAt.getTime() + delayMs(config, random))
    if (earliest.getTime() > at.getTime()) {
      at = earliest
      reason = 'min_interval'
    }
  }

  if (!isWithinOperatingHours(at, timeZone, operatingHours)) {
    at = nextOperatingWindowStart(at, timeZone, operatingHours)
    if (reason === 'ok') reason = 'operating_hours'
  }

  if (reason === 'ok') return { at: now, reason: 'ok' }
  return { at, reason }
}
