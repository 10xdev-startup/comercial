import { loadAgentLimits } from '@/config/limits'
import { isDatabaseConfigured } from '@/database/isConfigured'
import { supabase } from '@/database/supabase'
import { getMemoryStore } from '@/store/memoryStore'
import type { AiUsageEntry, CrmMetrics, SystemState } from '@/types/crm'

export const SystemStateModel = {
  async get(): Promise<SystemState> {
    if (!isDatabaseConfigured()) return getMemoryStore().system
    const { data, error } = await supabase.from('system_state').select('paused, pause_reason, updated_at').eq('id', 1).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return { paused: false, pauseReason: null, updatedAt: new Date().toISOString() }
    const row = data as { paused: boolean; pause_reason: string | null; updated_at: string }
    return { paused: row.paused, pauseReason: row.pause_reason, updatedAt: row.updated_at }
  },

  async setPaused(paused: boolean, reason: string | null): Promise<SystemState> {
    if (!isDatabaseConfigured()) return getMemoryStore().setPaused(paused, reason)
    const { data, error } = await supabase
      .from('system_state')
      .upsert({
        id: 1,
        paused,
        pause_reason: paused ? reason : null,
        updated_at: new Date().toISOString(),
      })
      .select('paused, pause_reason, updated_at')
      .single()
    if (error) throw new Error(error.message)
    const row = data as { paused: boolean; pause_reason: string | null; updated_at: string }
    return { paused: row.paused, pauseReason: row.pause_reason, updatedAt: row.updated_at }
  },
}

export const AiUsageModel = {
  async record(input: Omit<AiUsageEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<AiUsageEntry> {
    const entry: AiUsageEntry = {
      id: input.id ?? crypto.randomUUID(),
      model: input.model,
      purpose: input.purpose,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      estimatedCostUsd: input.estimatedCostUsd,
      leadId: input.leadId,
      createdAt: input.createdAt ?? new Date().toISOString(),
    }
    if (!isDatabaseConfigured()) return getMemoryStore().recordAiUsage(entry)
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
      .select('id, model, purpose, prompt_tokens, completion_tokens, estimated_cost_usd, lead_id, created_at')
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

  async monthSpendUsd(now = new Date()): Promise<number> {
    if (!isDatabaseConfigured()) return getMemoryStore().monthSpendUsd(now)
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const { data, error } = await supabase.from('ai_usage').select('estimated_cost_usd').gte('created_at', start)
    if (error) throw new Error(error.message)
    return (data ?? []).reduce((sum, row) => sum + Number((row as { estimated_cost_usd: number }).estimated_cost_usd), 0)
  },

  async metrics(leadCount: number, activeCustomerCount: number): Promise<CrmMetrics> {
    const monthlySpendUsd = await AiUsageModel.monthSpendUsd()
    const monthlyBudgetUsd = loadAgentLimits().openaiMonthlyBudgetUsd
    return {
      leadCount,
      activeCustomerCount,
      monthlySpendUsd,
      monthlyBudgetUsd,
      costPerLeadUsd: leadCount > 0 ? monthlySpendUsd / leadCount : null,
      costPerActiveCustomerUsd: activeCustomerCount > 0 ? monthlySpendUsd / activeCustomerCount : null,
    }
  },
}
