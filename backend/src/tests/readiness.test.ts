import { describe, it, expect, beforeEach } from '@jest/globals'
import type { Request, Response } from 'express'
import { CrmController } from '@/controllers/CrmController'
import {
  WEBHOOK_PATH,
  WEBHOOK_URL_HINT,
  collectReadiness,
  resetChromeCdpProbeOverride,
  setChromeCdpProbeOverride,
} from '@/domain/readiness'
import { resetMemoryStore } from '@/store/memoryStore'
import { SystemStateModel } from '@/models/SystemStateModel'
import { resetCircuitBreaker } from '@/observability/circuitBreaker'

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = ((code: number) => {
    ;(res as Response & { statusCode: number }).statusCode = code
    return res as Response
  }) as Response['status']
  res.json = ((payload: unknown) => {
    ;(res as Response & { body: unknown }).body = payload
    return res as Response
  }) as Response['json']
  return res as Response
}

describe('crm readiness', () => {
  beforeEach(() => {
    resetMemoryStore()
    resetCircuitBreaker()
    resetChromeCdpProbeOverride()
    delete process.env['SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']
    delete process.env['OPENAI_API_KEY']
    delete process.env['INSTAGRAM_APP_SECRET']
    delete process.env['INSTAGRAM_PAGE_ACCESS_TOKEN']
    delete process.env['INSTAGRAM_LIVE_SEND']
    delete process.env['CHROME_CDP_URL']
    delete process.env['MAX_DMS_PER_DAY']
    delete process.env['OPERATING_HOURS']
    delete process.env['OPERATING_TIMEZONE']
  })

  it('reports false flags with empty env stubs and never echoes secrets', async () => {
    process.env['OPENAI_API_KEY'] = 'sk-secret-test-value'
    process.env['INSTAGRAM_APP_SECRET'] = 'meta-secret-value'
    process.env['INSTAGRAM_PAGE_ACCESS_TOKEN'] = 'EAA-page-token-value'
    process.env['INSTAGRAM_LIVE_SEND'] = 'true'
    process.env['CHROME_CDP_URL'] = 'http://127.0.0.1:9222'
    setChromeCdpProbeOverride(async () => true)

    const snapshot = await collectReadiness()
    expect(snapshot.openaiKeyPresent).toBe(true)
    expect(snapshot.instagramAppSecretPresent).toBe(true)
    expect(snapshot.instagramPageTokenPresent).toBe(true)
    expect(snapshot.instagramLiveSend).toBe(true)
    expect(snapshot.chromeCdpConfigured).toBe(true)
    expect(snapshot.chromeCdpReachable).toBe(true)
    expect(snapshot.supabaseConfigured).toBe(false)
    expect(snapshot.webhookPath).toBe(WEBHOOK_PATH)
    expect(snapshot.webhookUrlHint).toBe(WEBHOOK_URL_HINT)
    expect(snapshot.maxDmsPerDay).toBe(30)
    expect(snapshot.operatingHours).toBe('09:00-20:00')
    expect(snapshot.operatingTimezone).toBe('America/Sao_Paulo')

    const dumped = JSON.stringify(snapshot)
    expect(dumped).not.toContain('sk-secret-test-value')
    expect(dumped).not.toContain('meta-secret-value')
    expect(dumped).not.toContain('EAA-page-token-value')
    expect(dumped).not.toContain('127.0.0.1:9222')
  })

  it('treats placeholder env as not present and skips CDP probe when unset', async () => {
    process.env['OPENAI_API_KEY'] = 'sua-chave-aqui'
    process.env['SUPABASE_URL'] = 'https://seu-projeto.supabase.co'
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'sua-service-role-key-aqui'
    process.env['INSTAGRAM_LIVE_SEND'] = 'false'
    let probed = false
    setChromeCdpProbeOverride(async () => {
      probed = true
      return true
    })
    const snapshot = await collectReadiness()
    expect(snapshot.openaiKeyPresent).toBe(false)
    expect(snapshot.supabaseConfigured).toBe(false)
    expect(snapshot.instagramLiveSend).toBe(false)
    expect(snapshot.chromeCdpConfigured).toBe(false)
    expect(snapshot.chromeCdpReachable).toBe(false)
    expect(probed).toBe(false)
  })

  it('marks Chrome unreachable when the URL is set but the probe fails', async () => {
    process.env['CHROME_CDP_URL'] = 'http://127.0.0.1:9222'
    setChromeCdpProbeOverride(async () => false)
    const snapshot = await collectReadiness()
    expect(snapshot.chromeCdpConfigured).toBe(true)
    expect(snapshot.chromeCdpReachable).toBe(false)
  })

  it('includes pause reason as a code, not a secret', async () => {
    await SystemStateModel.setPaused(true, 'openai_budget')
    const snapshot = await collectReadiness()
    expect(snapshot.workerPaused).toBe(true)
    expect(snapshot.pauseReason).toBe('openai_budget')
  })

  it('serves readiness through the CRM controller', async () => {
    const res = mockRes()
    await CrmController.readiness({} as Request, res)
    const body = (res as Response & { body: { success: boolean; data: { webhookPath: string } } }).body
    expect(body.success).toBe(true)
    expect(body.data.webhookPath).toBe('/webhooks/instagram')
  })

  it('exposes daily DM cap and operating hours without echoing secrets', async () => {
    process.env['MAX_DMS_PER_DAY'] = '12'
    process.env['OPERATING_HOURS'] = '10:00-18:00'
    process.env['OPERATING_TIMEZONE'] = 'America/Fortaleza'
    process.env['OPENAI_API_KEY'] = 'sk-live-operator-secret'
    process.env['CHROME_CDP_URL'] = 'http://cdp.internal:9222'

    const snapshot = await collectReadiness()
    expect(snapshot.maxDmsPerDay).toBe(12)
    expect(snapshot.operatingHours).toBe('10:00-18:00')
    expect(snapshot.operatingTimezone).toBe('America/Fortaleza')

    const dumped = JSON.stringify(snapshot)
    expect(dumped).not.toContain('sk-live-operator-secret')
    expect(dumped).not.toContain('cdp.internal')
    expect(dumped).not.toContain('9222')
  })
})
