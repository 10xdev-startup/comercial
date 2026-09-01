import { describe, it, expect } from '@jest/globals'
import { findBlockedClaim, parseBusinessConfig } from '@/domain/claims'
import { loadBusinessConfig, resetBusinessConfigCache } from '@/config/business'

describe('claims', () => {
  it('loads 10xMidia config without affiliate fields', () => {
    resetBusinessConfigCache()
    const config = loadBusinessConfig()
    expect(config.companyName).toBe('10xMídia')
    expect(config.ownerName).toBe('Luiz Bertucci')
    expect(config.whatsappLink).toBe('https://wa.me/5531988965216')
    expect(config.revenueModel).toMatch(/R\$ 75/)
    expect(JSON.stringify(config)).not.toMatch(/affiliate/i)
  })

  it('blocks unverified commercial claims and allows verified product copy', () => {
    const config = parseBusinessConfig({
      ownerName: 'A',
      ownerRole: 'B',
      companyName: 'C',
      companyWebsite: 'https://example.com',
      instagramHandle: '@x',
      whatsappLink: 'https://wa.me/1',
      oneLinePitch: 'pitch',
      howItWorks: ['a', 'b', 'c'],
      revenueModel: 'R$ 75',
      marketJargon: {},
      verifiedClaims: ['Conectar Meta Ads'],
      unverifiedClaims: ['10x more productive', '34% more leads', 'R$ 50 por cliente', 'ROI'],
      icpSegments: ['agencia'],
      icpKeywords: ['Meta Ads'],
      geography: 'Brasil',
    })
    expect(findBlockedClaim('We are 10x more productive', config)).toBe('10x more productive')
    expect(findBlockedClaim('Ganhe 34% more leads', config)).toBe('34% more leads')
    expect(findBlockedClaim('Plano antigo R$ 50 por cliente', config)).toBe('R$ 50 por cliente')
    expect(findBlockedClaim('ROI garantido', config)).toBe('ROI')
    expect(findBlockedClaim('Conecte Meta Ads, Google Ads e planilhas', config)).toBeNull()
  })
})
