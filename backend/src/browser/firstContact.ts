import { resolveComposer } from '@/browser/composer'
import type { FirstContactInput, FirstContactResult, InstagramComposer } from '@/browser/types'

export async function performFirstContact(input: FirstContactInput): Promise<FirstContactResult> {
  const composer: InstagramComposer = input.composer ?? await resolveComposer()
  try {
    await composer.openProfile(input.handle)
    await composer.openComposer()
    await composer.typeMessage(input.body)
    const click = await composer.send()
    return { sent: click.sent, dryRun: click.dryRun, actions: [...composer.actions] }
  } finally {
    await composer.dispose()
  }
}
