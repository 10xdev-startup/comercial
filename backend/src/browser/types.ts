export interface SendClickResult {
  sent: boolean
  dryRun: boolean
}

/**
 * Public Instagram web composer. Implementations must not spoof fingerprints,
 * call private APIs, or work around blocks/checkpoints.
 */
export interface InstagramComposer {
  readonly actions: string[]
  openProfile(handle: string): Promise<void>
  openComposer(): Promise<void>
  typeMessage(body: string): Promise<void>
  send(): Promise<SendClickResult>
  dispose(): Promise<void>
}

export interface FirstContactInput {
  handle: string
  body: string
  composer?: InstagramComposer
}

export interface FirstContactResult {
  sent: boolean
  dryRun: boolean
  actions: string[]
}
