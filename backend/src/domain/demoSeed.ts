import { loadBusinessConfig } from '@/config/business'
import { buildDemoClientLeads } from '@/domain/simulatedDiscovery'
import { LeadModel } from '@/models/LeadModel'
import { DoNotContactModel } from '@/models/SystemStateModel'
import type { Lead } from '@/types/crm'

export interface DemoSeedResult {
  created: number
  skipped: number
  seeded: boolean
  leads: Lead[]
}

export async function seedDemoClientLeadsIfEmpty(): Promise<DemoSeedResult> {
  const existing = await LeadModel.list()
  if (existing.length > 0) {
    return { created: 0, skipped: existing.length, seeded: false, leads: existing }
  }

  const catalog = buildDemoClientLeads(loadBusinessConfig())
  let created = 0
  let skipped = 0
  for (const candidate of catalog) {
    if (await DoNotContactModel.has(candidate.instagramHandle)) {
      skipped += 1
      continue
    }
    const already = await LeadModel.findByHandle(candidate.instagramHandle)
    if (already) {
      skipped += 1
      continue
    }
    await LeadModel.create(candidate)
    created += 1
  }
  return { created, skipped, seeded: created > 0, leads: await LeadModel.list() }
}
