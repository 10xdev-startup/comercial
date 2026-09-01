export interface OperatingWindow {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

export function parseOperatingHours(raw: string): OperatingWindow {
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(raw.trim())
  if (!match) {
    return { startHour: 9, startMinute: 0, endHour: 20, endMinute: 0 }
  }
  return {
    startHour: Number(match[1]),
    startMinute: Number(match[2]),
    endHour: Number(match[3]),
    endMinute: Number(match[4]),
  }
}

export function isWithinOperatingHours(
  now: Date,
  hoursRaw: string,
  timeZone: string,
): boolean {
  const window = parseOperatingHours(hoursRaw)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  const current = hour * 60 + minute
  const start = window.startHour * 60 + window.startMinute
  const end = window.endHour * 60 + window.endMinute
  return current >= start && current < end
}

export function secondsBetweenDms(minSeconds: number, maxSeconds: number, random = Math.random): number {
  const lo = Math.min(minSeconds, maxSeconds)
  const hi = Math.max(minSeconds, maxSeconds)
  return lo + Math.floor(random() * (hi - lo + 1))
}

export function wouldExceedDailyCap(sentToday: number, maxPerDay: number): boolean {
  return sentToday >= maxPerDay
}
