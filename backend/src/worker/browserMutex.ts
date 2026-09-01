let locked = false

export function tryAcquireBrowserMutex(): boolean {
  if (locked) return false
  locked = true
  return true
}

export function releaseBrowserMutex(): void {
  locked = false
}

export function resetBrowserMutex(): void {
  locked = false
}

export function isBrowserMutexLocked(): boolean {
  return locked
}
