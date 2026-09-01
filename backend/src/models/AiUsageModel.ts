import { randomUUID } from 'crypto'
import { isDatabaseConfigured } from '@/database/isConfigured'
import { supabase } from '@/database/supabase'
import { getMemoryStore } from '@/store/memoryStore'
import type { AiUsageEntry } from '@/types/crm'
import { SystemStateModel } from '@/models/SystemStateModel'
import { logEvent } from '@/observability/logger'

function useMemory(): boolean {
  return !isDatabaseConfigured()
}

function monthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString()
}

function budgetUsd(): number {
  const raw = Number(process.env['OPENAI_MONTHLY_BUDGET_USD'] ?? 50)
  return Number.isFinite(raw) && raw >= 0 ? raw : 50
}

export const AiUsageModel = {
  async record(input: {
    model: string
    purpose: string
    promptTokens: number
    completionTokens: number
    estimatedCostUsd: number
    leadId: string | null
  }): Promise<AiUsageEntry> {
    const entry: AiUsageEntry = {
      id: randomUUID(),
      model: input.model,
      purpose: input.purpose,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      estimatedCostUsd: input.estimatedCostUsd,
      leadId: input.leadId,
      createdAt: new Date().toISOString(),
    }
    if (useMemory()) return getMemoryStore().insertAiUsage(entry)
    const { data, error } = await supabase
      .from('ai_usage')
      .insert({
        id: entry.id,
        model: entry.model,
        purpose: entry.purpose,
        prompt_tokens: entry.promptTokens,
        completion_tokens: entry.completionTokens,
        estimated_cost_usd: entry.estimatedCostUsd,
        lead_id: entry.leadId,
        created_at: entry.createdAt,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    const row = data as {
      id: string
      model: string
      purpose: string
      prompt_tokens: number
      completion_tokens: number
      estimated_cost_usd: number | string
      lead_id: string | null
      created_at: string
    }
    return {
      id: row.id,
      model: row.model,
      purpose: row.purpose,
      promptTokens: row.prompt_tokens,
      completionTokens: row.completion_tokens,
      estimatedCostUsd: Number(row.estimated_cost_usd),
      leadId: row.lead_id,
      createdAt: row.created_at,
    }
  },

  async sumSince(sinceIso: string): Promise<number> {
    if (useMemory()) return getMemoryStore().sumAiUsageSince(sinceIso)
    const { data, error } = await supabase.from('ai_usage').select('estimated_cost_usd').gte('created_at', sinceIso)
    if (error) throw new Error(error.message)
    return ((data ?? []) as Array<{ estimated_cost_usd: number | string }>).reduce(
      (sum, row) => sum + Number(row.estimated_cost_usd),
      0,
    )
  },

  async monthSpend(now = new Date()): Promise<number> {
    return AiUsageModel.sumSince(monthStartIso(now))
  },

  async guardBudget(now = new Date()): Promise<boolean> {
    const cap = budgetUsd()
    const spent = await AiUsageModel.monthSpend(now)
    if (spent < cap) return true
    logEvent('openai_budget_paused', { spent, cap })
    await SystemStateModel.setPaused(true, 'openai_budget')
    return false
  },
}
