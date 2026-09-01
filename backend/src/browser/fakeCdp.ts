import type { InstagramComposer, SendClickResult } from '@/browser/types'
import { isLiveSendEnabled } from '@/browser/flags'

/** Minimal in-memory Instagram profile/composer page for tests and dry-run. */
export class SimulatedInstagramPage {
  url = ''
  html = ''
  composerOpen = false
  draft = ''
  sendClicks = 0

  goto(url: string): void {
    this.url = url
    const handle = url.replace(/https:\/\/www\.instagram\.com\//, '').replace(/\/$/, '')
    this.html = simulatedProfileHtml(handle)
    this.composerOpen = false
    this.draft = ''
  }

  openComposer(): void {
    if (!this.html.includes('data-sim="message-button"')) {
      throw new Error('composer_not_found: simulated page has no message button')
    }
    this.composerOpen = true
  }

  type(body: string): void {
    if (!this.composerOpen) throw new Error('composer_not_open')
    this.draft = body
  }

  clickSend(): void {
    if (!this.composerOpen || !this.draft) throw new Error('composer_empty')
    this.sendClicks += 1
  }
}

export function simulatedProfileHtml(handle: string): string {
  return `<!doctype html><html><body>
<a data-sim="message-button" href="/direct/t/simulated">Message</a>
<div data-sim="handle">${handle}</div>
<div role="textbox" data-sim="composer" contenteditable="true"></div>
<button type="submit" data-sim="send">Send</button>
</body></html>`
}

export class FakeCdpClient {
  readonly pages: SimulatedInstagramPage[] = []

  newPage(): SimulatedInstagramPage {
    const page = new SimulatedInstagramPage()
    this.pages.push(page)
    return page
  }
}

export class FakeInstagramComposer implements InstagramComposer {
  readonly actions: string[] = []
  readonly page: SimulatedInstagramPage

  constructor(client?: FakeCdpClient) {
    this.page = (client ?? new FakeCdpClient()).newPage()
  }

  async openProfile(handle: string): Promise<void> {
    const normalized = handle.trim().replace(/^@/, '')
    this.actions.push(`openProfile:${normalized}`)
    this.page.goto(`https://www.instagram.com/${normalized}/`)
  }

  async openComposer(): Promise<void> {
    this.actions.push('openComposer')
    this.page.openComposer()
  }

  async typeMessage(body: string): Promise<void> {
    this.actions.push('typeMessage')
    this.page.type(body)
  }

  async send(): Promise<SendClickResult> {
    this.actions.push('send')
    if (!isLiveSendEnabled()) {
      return { sent: false, dryRun: true }
    }
    this.page.clickSend()
    return { sent: true, dryRun: false }
  }

  async dispose(): Promise<void> {
    this.actions.push('dispose')
  }
}
