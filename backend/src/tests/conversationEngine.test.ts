import { describe, it, expect, beforeEach } from '@jest/globals'
import { AiUsageModel } from '@/models/AiUsageModel'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { DoNotContactModel, SystemStateModel } from '@/models/SystemStateModel'
import { resetMemoryStore } from '@/store/memoryStore'
import { processInboundMessages } from '@/integrations/instagram/inbound'
import { resetOpenAiCompleteOverride, setOpenAiCompleteOverride } from '@/integrations/openai/engine'
import { resetCircuitBreaker } from '@/observability/circuitBreaker'
import { resetBrowserMutex } from '@/worker/browserMutex'
import { tickOnce } from '@/worker/loop'
import { SKIPPED_DO_NOT_CONTACT, SKIPPED_OPENAI_BUDGET } from '@/types/job'
import { resetComposerOverride } from '@/browser/composer'

function inbound(handle: string, text: string, mid: string): unknown {
  return {
    entry: [{ messaging: [{ sender: { id: `sid-${handle}`, username: handle }, message: { mid, text } }] }],
  }
}

describe('openai conversation engine', () => {
  beforeEach(() => {
    resetMemoryStore()
    resetCircuitBreaker()
    resetBrowserMutex()
    resetComposerOverride()
    resetOpenAiCompleteOverride()
    delete process.env['SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']
    delete process.env['OPENAI_API_KEY']
    delete process.env['INSTAGRAM_PAGE_ACCESS_TOKEN']
    process.env['OPENAI_MONTHLY_BUDGET_USD'] = '50'
    process.env['OPERATING_HOURS'] = '00:00-24:00'
    process.env['OPERATING_TIMEZONE'] = 'UTC'
    process.env['WORKER_RETRY_BACKOFF_MS'] = '0'
  })

  it('uses a mocked OpenAI decision and replies via Graph stub after inbound', async () => {
    setOpenAiCompleteOverride(async () => ({
      text: JSON.stringify({
        intent: 'wants_whatsapp',
        action: 'handoff_whatsapp',
        reply: 'Perfeito. Segue o WhatsApp da 10xMídia: https://wa.me/5531988965216',
      }),
      promptTokens: 20,
      completionTokens: 12,
    }))
    const lead = await LeadModel.create({ instagramHandle: 'mock_openai' })
    const now = new Date('2026-09-01T12:00:00.000Z')
    await processInboundMessages(inbound('mock_openai', 'me passa o zap', 'mid-oa'), now)
    expect(await tickOnce(now)).toBe('ran')
    const jobs = await JobModel.list()
    expect(jobs[0]?.type).toBe('interpret_reply')
    expect(jobs[0]?.status).toBe('succeeded')
    expect(jobs[0]?.lastError).toBeNull()
    const updated = await LeadModel.findById(lead.id)
    expect(updated?.pipelineState).toBe('whatsapp_handoff')
    const messages = await LeadModel.listMessages(lead.id)
    expect(messages.some((message) => message.source === 'api' && message.direction === 'outbound')).toBe(true)
    expect(messages.some((message) => message.body.includes('wa.me/5531988965216'))).toBe(true)
    expect(await AiUsageModel.monthSpend(now)).toBeGreaterThan(0)
  })

  it('applies DNC immediately on opt-out and does not send', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'opt_out_me' })
    const now = new Date('2026-09-01T12:00:00.000Z')
    await processInboundMessages(inbound('opt_out_me', 'pare de me enviar', 'mid-stop'), now)
    expect(await tickOnce(now)).toBe('ran')
    expect(await DoNotContactModel.has('opt_out_me')).toBe(true)
    const updated = await LeadModel.findById(lead.id)
    expect(updated?.channelState).toBe('do_not_contact')
    const outbound = (await LeadModel.listMessages(lead.id)).filter((message) => message.direction === 'outbound')
    expect(outbound).toHaveLength(0)
  })

  it('pauses the worker when the OpenAI monthly budget is exhausted', async () => {
    process.env['OPENAI_MONTHLY_BUDGET_USD'] = '0'
    await LeadModel.create({ instagramHandle: 'budget' })
    const now = new Date('2026-09-01T12:00:00.000Z')
    await processInboundMessages(inbound('budget', 'quanto custa?', 'mid-budget'), now)
    expect(await tickOnce(now)).toBe('ran')
    const job = (await JobModel.list()).find((row) => row.type === 'interpret_reply')
    expect(job?.lastError).toBe(SKIPPED_OPENAI_BUDGET)
    const state = await SystemStateModel.get()
    expect(state.paused).toBe(true)
    expect(state.pauseReason).toBe('openai_budget')
    await JobModel.enqueue({ type: 'noop', payload: {}, runAt: now.toISOString() })
    expect(await tickOnce(now)).toBe('paused')
  })

  it('skips interpret_reply when the handle is already DNC', async () => {
    const lead = await LeadModel.create({ instagramHandle: 'ja_dnc' })
    await DoNotContactModel.add('ja_dnc', 'opt_out', 'test')
    const now = new Date('2026-09-01T12:00:00.000Z')
    await JobModel.enqueue({
      type: 'interpret_reply',
      payload: { leadId: lead.id, body: 'oi' },
      runAt: now.toISOString(),
    })
    expect(await tickOnce(now)).toBe('ran')
    const job = (await JobModel.list())[0]
    expect(job?.lastError).toBe(SKIPPED_DO_NOT_CONTACT)
  })

  it('replaces unverified claims from the model reply', async () => {
    setOpenAiCompleteOverride(async () => ({
      text: JSON.stringify({
        intent: 'asked_pricing',
        action: 'present',
        reply: 'Somos 10x mais produtivo e geramos 34% mais leads',
      }),
      promptTokens: 8,
      completionTokens: 8,
    }))
    await LeadModel.create({ instagramHandle: 'claims' })
    const now = new Date('2026-09-01T12:00:00.000Z')
    await processInboundMessages(inbound('claims', 'qual o preco?', 'mid-claim'), now)
    expect(await tickOnce(now)).toBe('ran')
    const outbound = (await LeadModel.listMessages((await LeadModel.findByHandle('claims'))!.id)).filter(
      (message) => message.direction === 'outbound',
    )
    expect(outbound[0]?.body.toLowerCase()).not.toContain('10x mais produtivo')
    expect(outbound[0]?.body.toLowerCase()).not.toContain('34%')
  })
})
