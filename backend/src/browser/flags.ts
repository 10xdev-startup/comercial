export function isLiveSendEnabled(): boolean {
  return process.env['INSTAGRAM_LIVE_SEND'] === 'true'
}

export function getChromeCdpUrl(): string | null {
  const raw = process.env['CHROME_CDP_URL']
  if (raw === undefined) return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

export function liveChromeReady(): boolean {
  return isLiveSendEnabled() && getChromeCdpUrl() !== null
}
