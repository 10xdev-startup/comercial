import type { Request, Response } from 'express'
import { loadBusinessConfig } from '@/config/business'
import { isChannelState } from '@/domain/channel'
import { isClientPipelineState } from '@/domain/pipeline'
import { AppError } from '@/utils/AppError'
import { sendOk } from '@/utils/apiResponse'
import { JobModel } from '@/models/JobModel'
import { LeadModel } from '@/models/LeadModel'
import { DoNotContactModel, SystemStateModel } from '@/models/SystemStateModel'
import { CLIENT_PIPELINE_ORDER, type Lead } from '@/types/crm'

function routeParam(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || !value) {
    throw new AppError(422, 'id e obrigatorio', 'INVALID_ID')
  }
  return value
}

function groupByPipeline(leads: Lead[]): Record<string, Lead[]> {
  const columns: Record<string, Lead[]> = {}
  for (const state of CLIENT_PIPELINE_ORDER) columns[state] = []
  for (const lead of leads) {
    const bucket = columns[lead.pipelineState] ?? (columns[lead.pipelineState] = [])
    bucket.push(lead)
  }
  return columns
}

export const CrmController = {
  async board(_req: Request, res: Response): Promise<void> {
    const leads = await LeadModel.list()
    sendOk(res, {
      columns: groupByPipeline(leads),
      leads,
      metrics: {
        leadCount: leads.length,
        activeCustomerCount: leads.filter((lead) => lead.pipelineState === 'active_customer').length,
      },
    })
  },

  async leadDetail(req: Request, res: Response): Promise<void> {
    const id = routeParam(req.params['id'])
    const lead = await LeadModel.findById(id)
    if (!lead) throw new AppError(404, 'Lead nao encontrado', 'LEAD_NOT_FOUND')
    const messages = await LeadModel.listMessages(lead.id)
    const conversation = await LeadModel.getOrCreateConversation(lead.id)
    sendOk(res, { lead, messages, conversation })
  },

  async createLead(req: Request, res: Response): Promise<void> {
    const body = (req.body ?? {}) as { instagramHandle?: unknown; displayName?: unknown; bio?: unknown; origin?: unknown }
    if (typeof body.instagramHandle !== 'string' || !body.instagramHandle.trim()) {
      throw new AppError(422, 'instagramHandle e obrigatorio', 'INVALID_HANDLE')
    }
    const handle = body.instagramHandle.trim()
    if (await DoNotContactModel.has(handle)) {
      throw new AppError(409, 'Este perfil esta na lista de nao contato', 'DO_NOT_CONTACT')
    }
    const existing = await LeadModel.findByHandle(handle)
    if (existing) throw new AppError(409, 'Lead ja cadastrado', 'LEAD_DUPLICATE')
    const createInput: { instagramHandle: string; displayName?: string | null; bio?: string | null; origin?: string | null } = {
      instagramHandle: handle,
    }
    if (typeof body.displayName === 'string') createInput.displayName = body.displayName
    if (typeof body.bio === 'string') createInput.bio = body.bio
    if (typeof body.origin === 'string') createInput.origin = body.origin
    const lead = await LeadModel.create(createInput)
    sendOk(res, { lead }, 201)
  },

  async updateLead(req: Request, res: Response): Promise<void> {
    const id = routeParam(req.params['id'])
    const lead = await LeadModel.findById(id)
    if (!lead) throw new AppError(404, 'Lead nao encontrado', 'LEAD_NOT_FOUND')
    const body = (req.body ?? {}) as { pipelineState?: unknown; channelState?: unknown; nextAction?: unknown; score?: unknown }
    const patch: { pipelineState?: Lead['pipelineState']; channelState?: Lead['channelState']; nextAction?: string | null; score?: number } = {}
    if (body.pipelineState !== undefined) {
      if (!isClientPipelineState(body.pipelineState)) {
        throw new AppError(422, 'pipelineState invalido', 'INVALID_PIPELINE')
      }
      patch.pipelineState = body.pipelineState
    }
    if (body.channelState !== undefined) {
      if (!isChannelState(body.channelState)) {
        throw new AppError(422, 'channelState invalido', 'INVALID_CHANNEL')
      }
      patch.channelState = body.channelState
    }
    if (body.nextAction !== undefined) {
      if (body.nextAction !== null && typeof body.nextAction !== 'string') {
        throw new AppError(422, 'nextAction deve ser string ou null', 'INVALID_NEXT_ACTION')
      }
      patch.nextAction = body.nextAction
    }
    if (body.score !== undefined) {
      if (typeof body.score !== 'number' || !Number.isFinite(body.score)) {
        throw new AppError(422, 'score deve ser numero', 'INVALID_SCORE')
      }
      patch.score = body.score
    }
    try {
      const updated = await LeadModel.update(id, patch)
      sendOk(res, { lead: updated })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar lead'
      if (message.startsWith('Invalid')) throw new AppError(422, message, 'INVALID_TRANSITION')
      throw err
    }
  },

  async addNote(req: Request, res: Response): Promise<void> {
    const id = routeParam(req.params['id'])
    const lead = await LeadModel.findById(id)
    if (!lead) throw new AppError(404, 'Lead nao encontrado', 'LEAD_NOT_FOUND')
    const body = (req.body ?? {}) as { body?: unknown }
    if (typeof body.body !== 'string' || !body.body.trim()) {
      throw new AppError(422, 'body e obrigatorio', 'INVALID_NOTE')
    }
    const job = await JobModel.enqueue({
      type: 'record_timeline',
      payload: { leadId: lead.id, body: body.body.trim(), source: 'system', direction: 'outbound' },
    })
    sendOk(res, { job }, 201)
  },

  async jobs(_req: Request, res: Response): Promise<void> {
    const jobs = await JobModel.list()
    sendOk(res, { jobs })
  },

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

  async publicConfig(_req: Request, res: Response): Promise<void> {
    const config = loadBusinessConfig()
    sendOk(res, {
      companyName: config.companyName,
      ownerName: config.ownerName,
      instagramHandle: config.instagramHandle,
      whatsappLink: config.whatsappLink,
      oneLinePitch: config.oneLinePitch,
      howItWorks: config.howItWorks,
      revenueModel: config.revenueModel,
      geography: config.geography,
    })
  },
}
