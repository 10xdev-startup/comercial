import { randomUUID } from 'crypto'
import { isDatabaseConfigured } from '@/database/isConfigured'
import { supabase } from '@/database/supabase'
import { rowToSystemState, type SystemStateRow } from '@/models/crmMappers'
import { getMemoryStore } from '@/store/memoryStore'
import type { DoNotContactEntry, SystemState } from '@/types/crm'

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function useMemory(): boolean {
  return !isDatabaseConfigured()
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase()
}

export const SystemStateModel = {
  async get(): Promise<SystemState> {
    if (useMemory()) return getMemoryStore().getSystem()
    const { data, error } = await supabase.from('system_state').select('*').eq('id', 1).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) {
      const { data: created, error: insertError } = await supabase
        .from('system_state')
        .insert({ id: 1, paused: false })
        .select('*')
        .single()
      if (insertError) throw new Error(insertError.message)
      return rowToSystemState(created as SystemStateRow)
    }
    return rowToSystemState(data as SystemStateRow)
  },

  async setPaused(paused: boolean, reason: string | null): Promise<SystemState> {
    if (useMemory()) return getMemoryStore().setPaused(paused, reason)
    const { data, error } = await supabase
      .from('system_state')
      .upsert({
        id: 1,
        paused,
        pause_reason: paused ? reason : null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToSystemState(data as SystemStateRow)
  },
}

export const DoNotContactModel = {
  async has(handle: string): Promise<boolean> {
    const normalized = normalizeHandle(handle)
    if (!normalized) return false
    if (useMemory()) return getMemoryStore().hasDoNotContact(normalized)
    const { data, error } = await supabase.from('do_not_contact').select('id').ilike('instagram_handle', escapeIlike(normalized)).maybeSingle()
    if (error) throw new Error(error.message)
    return data != null
  },

  async add(handle: string, reason: string, source: string): Promise<DoNotContactEntry> {
    const normalized = normalizeHandle(handle)
    const entry: DoNotContactEntry = {
      id: randomUUID(),
      instagramHandle: normalized,
      reason,
      source,
      createdAt: new Date().toISOString(),
    }
    if (useMemory()) return getMemoryStore().addDoNotContact(entry)
    const { data, error } = await supabase
      .from('do_not_contact')
      .insert({
        id: entry.id,
        instagram_handle: entry.instagramHandle,
        reason: entry.reason,
        source: entry.source,
        created_at: entry.createdAt,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    const row = data as { id: string; instagram_handle: string; reason: string; source: string; created_at: string }
    return {
      id: row.id,
      instagramHandle: row.instagram_handle,
      reason: row.reason,
      source: row.source,
      createdAt: row.created_at,
    }
  },
}
