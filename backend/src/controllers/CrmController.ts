import type { Request, Response } from 'express'
import { loadAgentLimits } from '@/config/limits'
import { loadBusinessConfig } from '@/config/business'
import { AppError } from '@/utils/AppError'
import { sendOk } from '@/utils/apiResponse'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { AiUsageModel, SystemStateModel } from '@/models/SystemStateModel'
import { AFFILIATE_PIPELINE_ORDER, CUSTOMER_PIPELINE_ORDER, type Funnel, type Lead, type PipelineState } from '@/types/crm'

function routeParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : ''
}

function parseFunnel(raw: unknown): Funnel | undefined {
  if (raw === 'customer' || raw === 'affiliate') return raw
  return undefined
}

function groupByPipeline(leads: Lead[], funnel: Funnel): Record<string, Lead[]> {
  const order: PipelineState[] = funnel === 'affiliate' ? AFFILIATE_PIPELINE_ORDER : CUSTOMER_PIPELINE_ORDER
  const columns: Record<string, Lead[]> = {}
  for (const state of order) columns[state] = []
  for (const lead of leads) {
    const bucket = columns[lead.pipelineState] ?? (columns[lead.pipelineState] = [])
    bucket.push(lead)
  }
  return columns
}

export const CrmController = {
  async board(req: Request, res: Response): Promise<void> {
    const funnel = parseFunnel(req.query['funnel']) ?? 'customer'
    const leads = await LeadModel.list(funnel)
    sendOk(res, {
      funnel,
      columns: groupByPipeline(leads, funnel),
      leads,
    })
  },

  async leadDetail(req: Request, res: Response): Promise<void> {
    const id = routeParam(req.params['id'])
    if (!id) throw new AppError(400, 'id obrigatorio', 'INVALID_ID')
    const lead = await LeadModel.findById(id)
    if (!lead) throw new AppError(404, 'Lead nao encontrado', 'LEAD_NOT_FOUND')
    const messages = await LeadModel.listMessages(lead.id)
    const conversation = await LeadModel.getOrCreateConversation(lead.id)
    sendOk(res, { lead, messages, conversation })
  },

  async metrics(_req: Request, res: Response): Promise<void> {
    const leads = await LeadModel.list()
    const activeCustomerCount = leads.filter((lead) => lead.pipelineState === 'active_customer').length
    const metrics = await AiUsageModel.metrics(leads.length, activeCustomerCount)
    sendOk(res, metrics)
  },

  async jobs(_req: Request, res: Response): Promise<void> {
    const jobs = await JobModel.list()
    sendOk(res, { jobs })
  },

  async enqueueFirstDm(req: Request, res: Response): Promise<void> {
    const body = (req.body ?? {}) as { leadId?: unknown; text?: unknown; dryRun?: unknown }
    const leadId = routeParam(req.params['id']) || (typeof body.leadId === 'string' ? body.leadId : '')
    if (!leadId) {
      throw new AppError(422, 'leadId obrigatorio', 'INVALID_LEAD')
    }
    const lead = await LeadModel.findById(leadId)
    if (!lead) throw new AppError(404, 'Lead nao encontrado', 'LEAD_NOT_FOUND')
    const payload: { leadId: string; dryRun: boolean; text?: string } = {
      leadId: lead.id,
      dryRun: body.dryRun === true,
    }
    if (typeof body.text === 'string') payload.text = body.text
    const job = await JobModel.enqueue({
      type: 'send_first_dm',
      payload,
      idempotencyKey: `first-dm:${lead.id}`,
    })
    sendOk(res, { job }, 201)
  },

  async publicConfig(_req: Request, res: Response): Promise<void> {
    const config = loadBusinessConfig()
    const limits = loadAgentLimits()
    sendOk(res, {
      companyName: config.companyName,
      ownerName: config.ownerName,
      instagramHandle: config.instagramHandle,
      whatsappLink: config.whatsappLink,
      affiliateGroupLink: config.affiliateGroupLink,
      oneLinePitch: config.oneLinePitch,
      limits: {
        maxDmsPerDay: limits.maxDmsPerDay,
        operatingHours: limits.operatingHours,
        operatingTimezone: limits.operatingTimezone,
        browserMode: limits.browserMode,
        openaiMonthlyBudgetUsd: limits.openaiMonthlyBudgetUsd,
      },
    })
  },
}

export const SystemController = {
  async status(_req: Request, res: Response): Promise<void> {
    const state = await SystemStateModel.get()
    sendOk(res, state)
  },

  async pause(req: Request, res: Response): Promise<void> {
    const body = (req.body ?? {}) as { paused?: unknown; reason?: unknown }
    if (typeof body.paused !== 'boolean') {
      throw new AppError(422, 'paused deve ser boolean', 'INVALID_PAUSE')
    }
    const reason = typeof body.reason === 'string' ? body.reason : 'manual'
    const state = await SystemStateModel.setPaused(body.paused, body.paused ? reason : null)
    sendOk(res, state)
  },
}
