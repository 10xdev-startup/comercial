export class BrowserUnavailableError extends Error {
  readonly code = 'browser_unavailable' as const

  constructor(message: string) {
    super(message)
    this.name = 'BrowserUnavailableError'
  }
}

export interface AccessibilityNode {
  role: string
  name: string
  ref: string
}

export interface CdpPage {
  url(): string
  goto(url: string): Promise<void>
  snapshot(): Promise<AccessibilityNode[]>
  type(ref: string, text: string, delayMs: number): Promise<void>
  click(ref: string): Promise<void>
  screenshot(): Promise<Buffer>
  close(): Promise<void>
}

export interface CdpClient {
  connect(): Promise<void>
  newPage(): Promise<CdpPage>
  close(): Promise<void>
}

export interface FirstDmResult {
  sent: boolean
  dryRun: boolean
  typed: string
  snapshot: AccessibilityNode[]
  pageUrl: string
}

let browserMutex: Promise<void> = Promise.resolve()

/** One browser job at a time — Instagram session is shared. */
export async function withBrowserMutex<T>(fn: () => Promise<T>): Promise<T> {
  const previous = browserMutex
  let release: () => void = () => undefined
  browserMutex = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  try {
    return await fn()
  } finally {
    release()
  }
}

export function assertInstagramUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }
  if (parsed.hostname !== 'www.instagram.com' && parsed.hostname !== 'instagram.com') {
    throw new Error(`Browser is restricted to instagram.com, got ${parsed.hostname}`)
  }
}
