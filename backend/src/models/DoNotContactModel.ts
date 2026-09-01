import { isDatabaseConfigured } from '@/database/isConfigured'
import { supabase } from '@/database/supabase'
import { getMemoryStore } from '@/store/memoryStore'
import type { DoNotContactEntry } from '@/types/crm'

export const DoNotContactModel = {
  async has(handle: string): Promise<boolean> {
    if (!isDatabaseConfigured()) return getMemoryStore().isDoNotContact(handle)
    const normalized = handle.replace(/^@/, '').trim().toLowerCase()
    const { data, error } = await supabase.from('do_not_contact').select('id, instagram_handle')
    if (error) throw new Error(error.message)
    return (data ?? []).some(
      (row) => String((row as { instagram_handle: string }).instagram_handle).replace(/^@/, '').trim().toLowerCase() === normalized,
    )
  },

  async add(handle: string, reason: string, source: string): Promise<DoNotContactEntry> {
    const entry: DoNotContactEntry = {
      id: crypto.randomUUID(),
      instagramHandle: handle.replace(/^@/, '').trim().toLowerCase(),
      reason,
      source,
      createdAt: new Date().toISOString(),
    }
    if (!isDatabaseConfigured()) return getMemoryStore().addDoNotContact(entry)
    const { data, error } = await supabase
      .from('do_not_contact')
      .upsert(
        {
          id: entry.id,
          instagram_handle: entry.instagramHandle,
          reason: entry.reason,
          source: entry.source,
          created_at: entry.createdAt,
        },
        { onConflict: 'instagram_handle' },
      )
      .select('id, instagram_handle, reason, source, created_at')
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
