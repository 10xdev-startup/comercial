import { DoNotContactModel } from '@/models/SystemStateModel'
import { LeadModel } from '@/models/LeadModel'
import type { Job } from '@/types/job'

export type JobOutcome = 'completed' | 'skipped'

function stubLog(job: Job, extra: Record<string, unknown>): void {
  console.info('[worker:stub]', job.type, { jobId: job.id, instagram: false, cdp: false, ...extra })
}

async function handleRecordTimeline(job: Job): Promise<JobOutcome> {
  const leadId = job.payload.leadId
  const body = job.payload.body
  if (!leadId || !body) throw new Error('record_timeline requires leadId and body')
  const lead = await LeadModel.findById(leadId)
  if (!lead) throw new Error(`Lead not found: ${leadId}`)
  if (await DoNotContactModel.has(lead.instagramHandle)) {
    await LeadModel.update(lead.id, { channelState: 'do_not_contact', pipelineState: 'closed' })
    return 'skipped'
  }
  await LeadModel.appendMessage({
    leadId: lead.id,
    body,
    direction: job.payload.direction ?? 'outbound',
    source: job.payload.source ?? 'system',
    jobId: job.id,
  })
  return 'completed'
}

async function handleSendStub(job: Job): Promise<JobOutcome> {
  const leadId = job.payload.leadId
  if (!leadId) throw new Error(`${job.type} requires leadId`)
  const lead = await LeadModel.findById(leadId)
  if (!lead) throw new Error(`Lead not found: ${leadId}`)
  if (await DoNotContactModel.has(lead.instagramHandle)) {
    stubLog(job, { outcome: 'skipped', reason: 'do_not_contact', leadId })
    return 'skipped'
  }
  stubLog(job, { outcome: 'completed', leadId, handle: lead.instagramHandle })
  return 'completed'
}

export async function handleJob(job: Job): Promise<JobOutcome> {
  switch (job.type) {
    case 'noop':
      return 'completed'
    case 'record_timeline':
      return handleRecordTimeline(job)
    case 'discover_leads':
      stubLog(job, { outcome: 'completed' })
      return 'completed'
    case 'interpret_reply':
      stubLog(job, { outcome: 'completed' })
      return 'completed'
    case 'send_first_dm':
    case 'follow_up':
      return handleSendStub(job)
    default: {
      const unexpected: never = job.type
      throw new Error(`unhandled job type: ${String(unexpected)}`)
    }
  }
}
