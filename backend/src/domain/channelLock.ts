export type ChannelOwner = 'browser' | 'api' | 'none'

export const SKIPPED_CHANNEL_LOCK = 'skipped:channel_lock'
export const SKIPPED_API_WINDOW = 'skipped:api_window_closed'

export function browserMaySend(owner: ChannelOwner): boolean {
  return owner === 'none' || owner === 'browser'
}

export function apiMaySend(owner: ChannelOwner): boolean {
  return owner === 'api'
}

export function assertBrowserMaySend(owner: ChannelOwner): void {
  if (!browserMaySend(owner)) {
    throw new Error(SKIPPED_CHANNEL_LOCK)
  }
}

export function assertApiMaySend(owner: ChannelOwner): void {
  if (!apiMaySend(owner)) {
    throw new Error(SKIPPED_CHANNEL_LOCK)
  }
}

export function isMessagingWindowOpen(expiresAt: string | null, now = new Date()): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() > now.getTime()
}

export function messagingWindowExpiresAt(from = new Date()): string {
  return new Date(from.getTime() + 24 * 60 * 60 * 1000).toISOString()
}
