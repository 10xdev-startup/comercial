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
    const { PlaywrightCdpComposer } = await import('@/browser/playwrightCdp')
    return PlaywrightCdpComposer.connect()
  }
  return new FakeInstagramComposer()
}
