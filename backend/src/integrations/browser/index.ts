import { loadAgentLimits } from '@/config/limits'
import { FakeCdpClient } from '@/integrations/browser/fakeCdp'
import { BrowserUnavailableError, type CdpClient } from '@/integrations/browser/types'

export { FakeCdpClient, sendFirstDmOnPage } from '@/integrations/browser/fakeCdp'
export { BrowserUnavailableError, withBrowserMutex, assertInstagramUrl } from '@/integrations/browser/types'
export type { AccessibilityNode, CdpClient, CdpPage, FirstDmResult } from '@/integrations/browser/types'

/**
 * CDP factory.
 *
 * - `BROWSER_MODE=simulated` (default): fake client + simulated Instagram page.
 * - `dry-run` / `live`: connect to the operator's Chrome. This process never
 *   launches Chrome. Playwright is an optional operator-machine dependency;
 *   without it we pause with `browser_unavailable` instead of pretending.
 */
export async function createCdpClient(): Promise<{ client: CdpClient; dryRun: boolean }> {
  const limits = loadAgentLimits()
  if (limits.browserMode === 'simulated') {
    return { client: new FakeCdpClient(), dryRun: false }
  }
  const cdpUrl = process.env['CHROME_CDP_URL']
  if (!cdpUrl) {
    throw new BrowserUnavailableError('CHROME_CDP_URL is not set')
  }

  try {
    const client = await connectOverCdp(cdpUrl)
    return { client, dryRun: limits.browserMode !== 'live' }
  } catch (err) {
    if (err instanceof BrowserUnavailableError) throw err
    throw new BrowserUnavailableError(err instanceof Error ? err.message : String(err))
  }
}

async function connectOverCdp(cdpUrl: string): Promise<CdpClient> {
  try {
    const res = await fetch(`${cdpUrl.replace(/\/$/, '')}/json/version`)
    if (!res.ok) {
      throw new BrowserUnavailableError(`Chrome CDP returned ${res.status} at ${cdpUrl}`)
    }
  } catch (err) {
    if (err instanceof BrowserUnavailableError) throw err
    throw new BrowserUnavailableError(`connectOverCDP failed for ${cdpUrl}: ${err instanceof Error ? err.message : String(err)}`)
  }
  throw new BrowserUnavailableError(
    'Chrome is reachable but Playwright is not wired in this environment. Install playwright on the operator machine and set BROWSER_MODE=dry-run. See SETUP.md.',
  )
}
