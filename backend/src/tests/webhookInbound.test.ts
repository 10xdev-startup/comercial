import { describe, it, expect, beforeEach } from '@jest/globals'
import { createHmac } from 'crypto'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { DoNotContactModel, SystemStateModel } from '@/models/SystemStateModel'
import { resetMemoryStore } from '@/store/memoryStore'
import { processInboundMessages } from '@/integrations/instagram/inbound'
import { verifySignature, verifyWebhookChallenge } from '@/integrations/instagram/webhook'
import { SKIPPED_CHANNEL_LOCK } from '@/domain/channelLock'
import { resetCircuitBreaker } from '@/observability/circuitBreaker'
import { resetBrowserMutex } from '@/worker/browserMutex'
import { tickOnce } from '@/worker/loop'
import { enqueueUniqueSend } from '@/worker/sendLock'
import { resetComposerOverride, setComposerOverride } from '@/browser/composer'
import { FakeInstagramComposer } from '@/browser/fakeCdp'

function messagingPayload(mid: string, text: string, username: string, senderId = 'igsid-1'): unknown {
  return {
    entry: [
      {
        messaging: [
          {
            sender: { id: senderId, username },
            message: { mid, text },
          },
        ],
      },
    ],
  }
}

describe('instagram webhook inbound', () => {
  beforeEach(() => {
    resetMemoryStore()
    resetCircuitBreaker()
    resetBrowserMutex()
    resetComposerOverride()
    delete process.env['SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']
    delete process.env['INSTAGRAM_APP_SECRET']
    delete process.env['INSTAGRAM_WEBHOOK_VERIFY_TOKEN']
    delete process.env['OPENAI_API_KEY']
    process.env['OPENAI_MONTHLY_BUDGET_USD'] = '50'
    process.env['OPERATING_HOURS'] = '00:00-24:00'
    process.env['OPERATING_TIMEZONE'] = 'UTC'
    process.env['MAX_DMS_PER_DAY'] = '30'
    process.env['MIN_SECONDS_BETWEEN_DMS'] = '0'
    process.env['MAX_SECONDS_BETWEEN_DMS'] = '0'
    process.env['WORKER_RETRY_BACKOFF_MS'] = '0'
  })

  it('accepts the verify challenge without a token (stub)', () => {
    expect(
      verifyWebhookChallenge({ mode: 'subscribe', token: 'any', challenge: '12345' }),
    ).toBe('12345')
  })

  it('stubs signature verification when the app secret is missing', () => {
    expect(verifySignature(Buffer.from('{}'), undefined)).toBe(true)
  })

  it('rejects a bad HMAC when INSTAGRAM_APP_SECRET is set', () => {
    process.env['INSTAGRAM_APP_SECRET'] = 'super-secret'
    expect(verifySignature(Buffer.from('{"ok":true}'), 'sha256=deadbeef')).toBe(false)
    const good = createHmac('sha256', 'super-secret').update(Buffer.from('{"ok":true}')).digest('hex')
    expect(verifySignature(Buffer.from('{"ok":true}'), `sha256=${good}`)).toBe(true)
  })

  it('is idempotent on the same mid and enqueues interpret_reply once', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'loja_webhook' })
    const payload = messagingPayload('mid-1', 'Oi, quero saber mais', 'loja_webhook')
    const first = await processInboundMessages(payload)
    const second = await processInboundMessages(payload)
    expect(first.processed).toBe(1)
    expect(second.duplicates).toBe(1)
    expect(second.processed).toBe(0)
    const messages = await LeadModel.listMessages(lead.id)
    expect(messages.filter((row) => row.externalId === 'mid-1')).toHaveLength(1)
    const jobs = (await JobModel.list()).filter((job) => job.type === 'interpret_reply')
    expect(jobs).toHaveLength(1)
    expect(jobs[0]?.idempotencyKey).toBe('interpret_reply:mid-1')
    const conversation = await LeadModel.getOrCreateConversation(lead.id)
    expect(conversation.channelOwner).toBe('api')
    const updated = await LeadModel.findById(lead.id)
    expect(updated?.channelState).toBe('api_active')
    expect(updated?.pipelineState).toBe('replied')
    expect(updated?.origin).toBe('igsid:igsid-1')
  })

  it('does not enqueue interpret_reply for a do-not-contact handle', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'sumiu' })
    await DoNotContactModel.add('sumiu', 'opt_out', 'test')
    await processInboundMessages(messagingPayload('mid-dnc', 'oi', 'sumiu'))
    expect(await JobModel.list()).toHaveLength(0)
    const updated = await LeadModel.findById(lead.id)
    expect(updated?.channelState).toBe('do_not_contact')
  })

  it('pauses on a restriction webhook via circuit breaker', async () => {
    await processInboundMessages({
      entry: [{ changes: [{ field: 'restriction', value: { sender_id: 'x', text: 'blocked' } }] }],
    })
    const state = await SystemStateModel.get()
    expect(state.paused).toBe(true)
    expect(state.pauseReason).toBe('instagram_restriction')
  })

  it('locks the browser out of a thread after webhook handoff', async () => {
    const fake = new FakeInstagramComposer()
    setComposerOverride(fake)
    const lead = await LeadModel.create({ instagramHandle: 'lock_thread' })
    const now = new Date('2026-09-01T12:00:00.000Z')
    await enqueueUniqueSend({ type: 'send_first_dm', leadId: lead.id, runAt: now.toISOString(), body: 'Oi' })
    expect(await tickOnce(now)).toBe('ran')
    await processInboundMessages(messagingPayload('mid-lock', 'quero whatsapp', 'lock_thread'), now)
    expect(await tickOnce(now)).toBe('ran')
    await JobModel.enqueue({
      type: 'send_first_dm',
      payload: { leadId: lead.id, body: 'nao deveria ir' },
      runAt: now.toISOString(),
      idempotencyKey: 'send_first_dm:lock_thread:forced',
    })
    expect(await tickOnce(now)).toBe('ran')
    const skipped = (await JobModel.list()).find((job) => job.idempotencyKey === 'send_first_dm:lock_thread:forced')
    expect(skipped?.status).toBe('succeeded')
    expect(skipped?.lastError).toBe(SKIPPED_CHANNEL_LOCK)
    expect(fake.actions.filter((action) => action === 'openComposer')).toHaveLength(1)
  })

  it('sends follow-up through the Graph stub after handoff, never the browser', async () => {
    const fake = new FakeInstagramComposer()
    setComposerOverride(fake)
    const lead = await LeadModel.create({ instagramHandle: 'api_follow' })
    const now = new Date('2026-09-01T12:00:00.000Z')
    await processInboundMessages(messagingPayload('mid-fu', 'oi', 'api_follow'), now)
    expect(await tickOnce(now)).toBe('ran')
    const composersBefore = fake.actions.length
    await JobModel.enqueue({
      type: 'follow_up',
      payload: { leadId: lead.id, body: 'passando para lembrar', followUpKey: 'nudge' },
      runAt: now.toISOString(),
    })
    expect(await tickOnce(now)).toBe('ran')
    const follow = (await JobModel.list()).find((job) => job.type === 'follow_up')
    expect(follow?.status).toBe('succeeded')
    expect(follow?.lastError).toBeNull()
    expect(fake.actions.length).toBe(composersBefore)
    const outbound = (await LeadModel.listMessages(lead.id)).filter((message) => message.source === 'api' && message.direction === 'outbound')
    expect(outbound.some((message) => message.body.includes('passando para lembrar'))).toBe(true)
  })
})
