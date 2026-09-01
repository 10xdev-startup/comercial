import { describe, it, expect, beforeEach } from '@jest/globals'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { getMemoryStore, resetMemoryStore } from '@/store/memoryStore'
import { ingestWebhookPayload, recoverAndTick, tickOnce } from '@/worker/handlers'
import type { Lead } from '@/types/crm'

const NOW = new Date('2026-09-01T15:00:00.000Z')

describe('durable jobs', () => {
  beforeEach(() => {
    resetMemoryStore(false)
  })

  it('claims the oldest due job and marks it succeeded', async () => {
    const lead: Lead = {
      id: 'lead-job',
      instagramHandle: 'fila_um',
      displayName: 'Fila',
      bio: null,
      funnel: 'customer',
      pipelineState: 'qualified',
      channelState: 'browser_contact_pending',
      score: 1,
      niche: null,
      tags: [],
      origin: 'test',
      roleGuess: 'unknown',
      nextAction: null,
      nextActionAt: null,
      campaignId: null,
      experimentId: null,
      experimentVariant: null,
      metaIgsid: null,
      lastContactedAt: null,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    }
    await LeadModel.insert(lead)
    await JobModel.enqueue({
      type: 'send_first_dm',
      payload: { leadId: 'lead-job', text: 'oi' },
      runAt: '2026-09-01T14:00:00.000Z',
    })
    await tickOnce(NOW)
    const jobs = await JobModel.list()
    expect(jobs[0]?.status).toBe('succeeded')
  })

  it('recovers a stuck running job after restart', async () => {
    const store = getMemoryStore()
    store.enqueueJob({ type: 'follow_up', payload: { leadId: 'x' }, runAt: '2026-09-01T11:00:00.000Z' })
    const claimed = store.claimNextJob('worker-old', new Date('2026-09-01T12:00:00.000Z'))
    expect(claimed?.status).toBe('running')
    const recovered = store.recoverStuckJobs(60_000, NOW)
    expect(recovered).toBe(1)
    expect(store.listJobs()[0]?.status).toBe('pending')
    await recoverAndTick(NOW)
  })

  it('is idempotent on the same webhook delivery', async () => {
    await LeadModel.insert({
      id: 'lead-hook',
      instagramHandle: 'hook_loja',
      displayName: 'Hook',
      bio: null,
      funnel: 'customer',
      pipelineState: 'contacted',
      channelState: 'waiting_inbound_reply',
      score: 50,
      niche: null,
      tags: [],
      origin: 'test',
      roleGuess: 'owner',
      nextAction: 'wait_reply',
      nextActionAt: null,
      campaignId: null,
      experimentId: null,
      experimentVariant: null,
      metaIgsid: 'igsid-hook',
      lastContactedAt: NOW.toISOString(),
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    })
    const payload = {
      entry: [{ messaging: [{ sender: { id: 'igsid-hook' }, message: { mid: 'mid-dup', text: 'quero saber' } }] }],
    }
    await ingestWebhookPayload(payload)
    await ingestWebhookPayload(payload)
    const messages = await LeadModel.listMessages('lead-hook')
    expect(messages.filter((row) => row.externalId === 'mid-dup')).toHaveLength(1)
    const lead = await LeadModel.findById('lead-hook')
    expect(lead?.channelState).toBe('api_active')
    expect(lead?.pipelineState).toBe('replied')
    const inboundJobs = (await JobModel.list()).filter((job) => job.type === 'process_inbound')
    expect(inboundJobs).toHaveLength(1)
  })
})
