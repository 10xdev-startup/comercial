import { FakeInstagramComposer } from '@/browser/fakeCdp'
import { getChromeCdpUrl, isLiveSendEnabled } from '@/browser/flags'
import type { InstagramComposer } from '@/browser/types'

let override: InstagramComposer | null = null

export function setComposerOverride(composer: InstagramComposer | null): void {
  override = composer
}

export function resetComposerOverride(): void {
  override = null
}

export async function resolveComposer(): Promise<InstagramComposer> {
  if (override) return override
  if (isLiveSendEnabled() && !getChromeCdpUrl()) {
    throw new Error('INSTAGRAM_LIVE_SEND=true requires CHROME_CDP_URL')
  }
  if (getChromeCdpUrl()) {
    try {
      const { PlaywrightCdpComposer } = await import('@/browser/playwrightCdp')
      return await PlaywrightCdpComposer.connect()
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('browser_unavailable:')) throw err
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`browser_unavailable: ${message}`, { cause: err })
    }
  }
  return new FakeInstagramComposer()
}
