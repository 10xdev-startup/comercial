import { assertInstagramUrl, type AccessibilityNode, type CdpClient, type CdpPage } from '@/integrations/browser/types'

interface FakePageState {
  url: string
  composer: string
  sent: string[]
  closed: boolean
}

class FakeCdpPage implements CdpPage {
  private readonly state: FakePageState = {
    url: 'about:blank',
    composer: '',
    sent: [],
    closed: false,
  }

  url(): string {
    return this.state.url
  }

  async goto(url: string): Promise<void> {
    this.assertOpen()
    assertInstagramUrl(url)
    this.state.url = url
  }

  async snapshot(): Promise<AccessibilityNode[]> {
    this.assertOpen()
    return [
      { role: 'textbox', name: 'Message', ref: 'e1' },
      { role: 'button', name: 'Send', ref: 'e2' },
    ]
  }

  async type(ref: string, text: string, delayMs: number): Promise<void> {
    this.assertOpen()
    if (ref !== 'e1') throw new Error(`Unknown ref for type: ${ref}`)
    if (delayMs < 0) throw new Error('delayMs must be >= 0')
    this.state.composer += text
  }

  async click(ref: string): Promise<void> {
    this.assertOpen()
    if (ref !== 'e2') throw new Error(`Unknown ref for click: ${ref}`)
    if (!this.state.composer) throw new Error('Cannot send an empty message')
    this.state.sent.push(this.state.composer)
    this.state.composer = ''
  }

  async screenshot(): Promise<Buffer> {
    this.assertOpen()
    return Buffer.from(`fake-screenshot:${this.state.url}`)
  }

  async close(): Promise<void> {
    this.state.closed = true
  }

  sentMessages(): string[] {
    return [...this.state.sent]
  }

  private assertOpen(): void {
    if (this.state.closed) throw new Error('Page already closed')
  }
}

export class FakeCdpClient implements CdpClient {
  private connected = false
  private readonly pages: FakeCdpPage[] = []

  async connect(): Promise<void> {
    this.connected = true
  }

  async newPage(): Promise<CdpPage> {
    if (!this.connected) throw new Error('CDP client is not connected')
    const page = new FakeCdpPage()
    this.pages.push(page)
    return page
  }

  async close(): Promise<void> {
    this.connected = false
    await Promise.all(this.pages.map((page) => page.close()))
  }
}

/** Simulated Instagram thread used by tests and BROWSER_MODE=simulated. */
export async function sendFirstDmOnPage(
  page: CdpPage,
  handle: string,
  text: string,
  options: { dryRun: boolean; typeDelayMs?: number },
): Promise<{ typed: string; sent: boolean; snapshot: AccessibilityNode[]; pageUrl: string }> {
  const typeDelayMs = options.typeDelayMs ?? 15
  await page.goto(`https://www.instagram.com/direct/new/?to=${encodeURIComponent(handle)}`)
  const snapshot = await page.snapshot()
  const box = snapshot.find((node) => node.role === 'textbox' && node.name === 'Message')
  const send = snapshot.find((node) => node.role === 'button' && node.name === 'Send')
  if (!box || !send) throw new Error('DM composer not found in accessibility snapshot')
  await page.type(box.ref, text, typeDelayMs)
  if (!options.dryRun) await page.click(send.ref)
  return {
    typed: text,
    sent: !options.dryRun,
    snapshot,
    pageUrl: page.url(),
  }
}
