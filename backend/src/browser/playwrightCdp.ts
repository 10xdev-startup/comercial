import { chromium, type Browser, type Page } from 'playwright-core'
import { getChromeCdpUrl, isLiveSendEnabled } from '@/browser/flags'
import type { InstagramComposer, SendClickResult } from '@/browser/types'

const PROFILE_URL = 'https://www.instagram.com'

function restrictionError(): Error {
  return new Error('instagram_restriction: checkpoint or block detected; will not bypass')
}

/**
 * Attaches to the operator's already-running Chrome via CDP.
 * Public web UI only: no extra headers, no evasion plugins, no unofficial endpoints.
 */
export class PlaywrightCdpComposer implements InstagramComposer {
  readonly actions: string[] = []
  private browser: Browser | null = null
  private page: Page | null = null
  private composerReady = false
  private draft = ''

  static async connect(): Promise<PlaywrightCdpComposer> {
    const cdpUrl = getChromeCdpUrl()
    if (!cdpUrl) throw new Error('CHROME_CDP_URL is required for live Chrome attach')
    const composer = new PlaywrightCdpComposer()
    composer.browser = await chromium.connectOverCDP(cdpUrl)
    const context = composer.browser.contexts()[0]
    if (!context) throw new Error('cdp_no_context: Chrome attached but has no browser context')
    composer.page = context.pages()[0] ?? await context.newPage()
    return composer
  }

  async openProfile(handle: string): Promise<void> {
    const page = this.requirePage()
    const normalized = handle.trim().replace(/^@/, '')
    this.actions.push(`openProfile:${normalized}`)
    await page.goto(`${PROFILE_URL}/${normalized}/`, { waitUntil: 'domcontentloaded' })
    await this.assertNotRestricted(page)
  }

  async openComposer(): Promise<void> {
    const page = this.requirePage()
    this.actions.push('openComposer')
    await this.assertNotRestricted(page)
    const button = page.getByRole('link', { name: /message|mensagem/i }).or(page.locator('a[href*="/direct/"]')).first()
    await button.click({ timeout: 8000 })
    this.composerReady = true
  }

  async typeMessage(body: string): Promise<void> {
    const page = this.requirePage()
    this.actions.push('typeMessage')
    if (!this.composerReady) throw new Error('composer_not_open')
    await page.locator('textarea, [role="textbox"]').last().fill(body, { timeout: 8000 })
    this.draft = body
  }

  async send(): Promise<SendClickResult> {
    this.actions.push('send')
    if (!isLiveSendEnabled()) {
      console.info('[browser:cdp] dry-run: refusing to click Send on Instagram')
      return { sent: false, dryRun: true }
    }
    const page = this.requirePage()
    if (!this.composerReady || !this.draft) throw new Error('composer_empty')
    await page.getByRole('button', { name: /^(send|enviar)$/i }).first().click({ timeout: 8000 })
    return { sent: true, dryRun: false }
  }

  async dispose(): Promise<void> {
    this.actions.push('dispose')
    this.page = null
    this.browser = null
  }

  private requirePage(): Page {
    if (!this.page) throw new Error('cdp_not_connected')
    return this.page
  }

  private async assertNotRestricted(page: Page): Promise<void> {
    const body = ((await page.textContent('body')) ?? '').toLowerCase()
    if (
      body.includes('checkpoint') ||
      body.includes('unusual activity') ||
      body.includes('we suspended') ||
      body.includes('confirm you') ||
      body.includes('try again later')
    ) {
      throw restrictionError()
    }
  }
}
