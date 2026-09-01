import { describe, it, expect } from '@jest/globals'
import { monthlySpendExceedsBudget, estimateCostUsd } from '@/domain/budget'
import { findBlockedClaim, parseBusinessConfig } from '@/domain/claims'
import { CRM_DDL, CRM_TABLES } from '@/database/crmDdl'
import { isWithinOperatingHours } from '@/domain/rateLimit'

describe('budget', () => {
  it('pauses when spend reaches the monthly cap', () => {
    expect(monthlySpendExceedsBudget(50, 50)).toBe(true)
    expect(monthlySpendExceedsBudget(49.9, 50)).toBe(false)
    expect(monthlySpendExceedsBudget(10, 0)).toBe(false)
  })

  it('estimates cost from token counts', () => {
    expect(estimateCostUsd('stub', 1000, 1000)).toBe(0)
    expect(estimateCostUsd('gpt-4.1', 1_000_000, 0)).toBe(2)
  })
})

describe('verified claims', () => {
  it('blocks unverified phrases', () => {
    const config = parseBusinessConfig({
      unverifiedClaims: ['melhor do Brasil', 'aprovação garantida'],
    })
    expect(findBlockedClaim('Somos o melhor do Brasil', config)).toBe('melhor do Brasil')
    expect(findBlockedClaim('Oi, vi sua loja', config)).toBeNull()
  })
})

describe('CRM DDL', () => {
  it('declares every required table and keeps pipeline/channel as separate columns', () => {
    for (const table of CRM_TABLES) {
      expect(CRM_DDL).toContain(`public.${table}`)
    }
    expect(CRM_DDL).toContain('pipeline_state')
    expect(CRM_DDL).toContain('channel_state')
    expect(CRM_DDL).toContain('claim_next_job')
  })
})

describe('operating hours', () => {
  it('is open at noon in Sao Paulo', () => {
    expect(
      isWithinOperatingHours(new Date('2026-09-01T15:00:00.000Z'), '09:00-20:00', 'America/Sao_Paulo'),
    ).toBe(true)
  })

  it('is closed at 3am in Sao Paulo', () => {
    expect(
      isWithinOperatingHours(new Date('2026-09-01T06:00:00.000Z'), '09:00-20:00', 'America/Sao_Paulo'),
    ).toBe(false)
  })
})
