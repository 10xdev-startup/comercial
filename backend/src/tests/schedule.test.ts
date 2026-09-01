import { describe, it, expect } from '@jest/globals'
import { parseOperatingHours } from '@/config/rateLimits'
import { getZonedParts, nextAllowedSendAt, nextOperatingWindowStart, zonedTimeToUtc } from '@/worker/schedule'

const config = {
  maxDmsPerDay: 30,
  minSecondsBetweenDms: 90,
  maxSecondsBetweenDms: 90,
  operatingHours: { startMinutes: 9 * 60, endMinutes: 20 * 60 },
  timeZone: 'America/Sao_Paulo',
}

describe('dm send schedule', () => {
  it('maps 09:00 in America/Sao_Paulo to 12:00 UTC (no DST)', () => {
    const at = zonedTimeToUtc('America/Sao_Paulo', 2026, 9, 2, 9, 0, 0)
    expect(at.toISOString()).toBe('2026-09-02T12:00:00.000Z')
    const parts = getZonedParts(new Date('2026-09-01T23:30:00.000Z'), 'America/Sao_Paulo')
    expect(parts.hour).toBe(20)
    expect(parts.minute).toBe(30)
  })

  it('defers to the next window when outside operating hours', () => {
    const now = new Date('2026-09-01T23:30:00.000Z')
    const decision = nextAllowedSendAt({ now, lastSendAt: null, dmsToday: 0, config })
    expect(decision.reason).toBe('operating_hours')
    expect(decision.at.toISOString()).toBe('2026-09-02T12:00:00.000Z')
    expect(nextOperatingWindowStart(now, config.timeZone, config.operatingHours).toISOString()).toBe(
      '2026-09-02T12:00:00.000Z',
    )
  })

  it('enforces min interval from the last send', () => {
    const now = new Date('2026-09-01T15:00:00.000Z')
    const lastSendAt = new Date('2026-09-01T14:59:30.000Z')
    const decision = nextAllowedSendAt({ now, lastSendAt, dmsToday: 0, config, random: () => 0 })
    expect(decision.reason).toBe('min_interval')
    expect(decision.at.toISOString()).toBe('2026-09-01T15:01:00.000Z')
  })

  it('defers to next operating start when the daily cap is reached', () => {
    const now = new Date('2026-09-01T15:00:00.000Z')
    const decision = nextAllowedSendAt({ now, lastSendAt: null, dmsToday: 30, config })
    expect(decision.reason).toBe('daily_cap')
    expect(decision.at.toISOString()).toBe('2026-09-02T12:00:00.000Z')
  })

  it('accepts 00:00-24:00 as always open', () => {
    expect(parseOperatingHours('00:00-24:00')).toEqual({ startMinutes: 0, endMinutes: 24 * 60 })
  })
})
