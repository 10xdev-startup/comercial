import { describe, it, expect, beforeEach } from '@jest/globals'
import { readFileSync } from 'fs'
import path from 'path'
import { resolveComposer, resetComposerOverride, setComposerOverride } from '@/browser/composer'
import { FakeCdpClient, FakeInstagramComposer } from '@/browser/fakeCdp'
import { isLiveSendEnabled, liveChromeReady } from '@/browser/flags'
import { performFirstContact } from '@/browser/firstContact'

describe('fake CDP first contact', () => {
  beforeEach(() => {
    resetComposerOverride()
    delete process.env['INSTAGRAM_LIVE_SEND']
    delete process.env['CHROME_CDP_URL']
  })

  it('walks the simulated composer and does not click send in dry-run', async () => {
    const client = new FakeCdpClient()
    const fake = new FakeInstagramComposer(client)
    const result = await performFirstContact({
      handle: '@loja_demo',
      body: 'Oi, vi seu perfil',
      composer: fake,
    })
    expect(result.dryRun).toBe(true)
    expect(result.sent).toBe(false)
    expect(fake.page.sendClicks).toBe(0)
    expect(fake.page.draft).toBe('Oi, vi seu perfil')
    expect(fake.page.composerOpen).toBe(true)
    expect(fake.page.html).toContain('data-sim="message-button"')
    expect(fake.actions).toEqual([
      'openProfile:loja_demo',
      'openComposer',
      'typeMessage',
      'send',
      'dispose',
    ])
  })

  it('defaults resolveComposer to the fake CDP client', async () => {
    const composer = await resolveComposer()
    expect(composer).toBeInstanceOf(FakeInstagramComposer)
    expect(isLiveSendEnabled()).toBe(false)
    expect(liveChromeReady()).toBe(false)
  })

  it('refuses live send when the flag is set without CHROME_CDP_URL', async () => {
    process.env['INSTAGRAM_LIVE_SEND'] = 'true'
    await expect(resolveComposer()).rejects.toThrow(/CHROME_CDP_URL/)
  })

  it('uses an injected composer override in tests', async () => {
    const fake = new FakeInstagramComposer()
    setComposerOverride(fake)
    expect(await resolveComposer()).toBe(fake)
  })

  it('playwright CDP attach is connectOverCDP only, with no stealth or private API', () => {
    const src = readFileSync(path.resolve(__dirname, '../browser/playwrightCdp.ts'), 'utf8')
    expect(src).toContain('connectOverCDP')
    expect(src).toContain('instagram_restriction')
    expect(src).not.toMatch(/puppeteer-extra|playwright-extra|stealth-plugin|userAgentOverride|graph\.facebook/)
  })
})
