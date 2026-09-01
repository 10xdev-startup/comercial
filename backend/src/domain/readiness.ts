import { getChromeCdpUrl, isLiveSendEnabled } from '@/browser/flags'
import { isDatabaseConfigured } from '@/database/isConfigured'
import { SystemStateModel } from '@/models/SystemStateModel'

export const WEBHOOK_URL_HINT = 'https://SEU_DOMINIO/webhooks/instagram'
export const WEBHOOK_PATH = '/webhooks/instagram'

export interface CrmReadiness {
  supabaseConfigured: boolean
  openaiKeyPresent: boolean
  instagramAppSecretPresent: boolean
  instagramPageTokenPresent: boolean
  instagramLiveSend: boolean
  chromeCdpConfigured: boolean
  chromeCdpReachable: boolean
  workerPaused: boolean
  pauseReason: string | null
  webhookUrlHint: string
  webhookPath: string
}

type ChromeProbe = (cdpUrl: string) => Promise<boolean>

let chromeProbeOverride: ChromeProbe | null = null

export function setChromeCdpProbeOverride(fn: ChromeProbe | null): void {
  chromeProbeOverride = fn
}

export function resetChromeCdpProbeOverride(): void {
  chromeProbeOverride = null
}

export function envFlagPresent(name: string): boolean {
  const raw = process.env[name]
  if (raw === undefined) return false
  const trimmed = raw.trim()
  if (!trimmed) return false
  if (trimmed.includes('sua-') || trimmed.includes('aqui') || trimmed.includes('seu-')) return false
  if (trimmed === '[REDACTED]') return false
  return true
}

export async function probeChromeCdp(cdpUrl: string): Promise<boolean> {
  if (chromeProbeOverride) return chromeProbeOverride(cdpUrl)
  const versionUrl = `${cdpUrl.replace(/\/$/, '')}/json/version`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 800)
  try {
    const res = await fetch(versionUrl, { signal: controller.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function collectReadiness(): Promise<CrmReadiness> {
  const chromeCdpUrl = getChromeCdpUrl()
  const chromeCdpConfigured = chromeCdpUrl !== null
  const chromeCdpReachable = chromeCdpConfigured ? await probeChromeCdp(chromeCdpUrl) : false
  const state = await SystemStateModel.get()
  return {
    supabaseConfigured: isDatabaseConfigured(),
    openaiKeyPresent: envFlagPresent('OPENAI_API_KEY'),
    instagramAppSecretPresent: envFlagPresent('INSTAGRAM_APP_SECRET'),
    instagramPageTokenPresent: envFlagPresent('INSTAGRAM_PAGE_ACCESS_TOKEN'),
    instagramLiveSend: isLiveSendEnabled(),
    chromeCdpConfigured,
    chromeCdpReachable,
    workerPaused: state.paused,
    pauseReason: state.pauseReason,
    webhookUrlHint: WEBHOOK_URL_HINT,
    webhookPath: WEBHOOK_PATH,
  }
}
