import type { BusinessConfig } from '@/domain/claims'
import type { CreateLeadInput } from '@/models/LeadModel'
import type { LeadRoleGuess } from '@/types/crm'

export const SIMULATED_ICP_ORIGIN = 'simulated_icp'

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
}

function guessRole(segment: string): LeadRoleGuess {
  const lower = segment.toLocaleLowerCase('pt-BR')
  if (lower.includes('agência') || lower.includes('agencia')) return 'store'
  if (lower.includes('gestor')) return 'decision_maker'
  if (lower.includes('dono') || lower.includes('autônomo') || lower.includes('autonomo')) return 'owner'
  return 'unknown'
}

function ownHandle(config: BusinessConfig): string {
  return config.instagramHandle.trim().replace(/^@/, '').toLowerCase()
}

export function isAgencyOrOwnerSegment(segment: string): boolean {
  const lower = segment.toLocaleLowerCase('pt-BR')
  if (lower.includes('agência') || lower.includes('agencia')) return true
  return lower.includes('dono')
}

export function buildDemoClientLeads(config: BusinessConfig): CreateLeadInput[] {
  return buildSimulatedIcpLeads(config).filter((lead) => isAgencyOrOwnerSegment(lead.niche ?? ''))
}

export function buildSimulatedIcpLeads(config: BusinessConfig): CreateLeadInput[] {
  const geo = slugify(config.geography) || 'br'
  const keywords = config.icpKeywords.length > 0 ? config.icpKeywords : ['cliente']
  const seen = new Set<string>([ownHandle(config)])
  const leads: CreateLeadInput[] = []

  for (const [index, segment] of config.icpSegments.entries()) {
    const slug = slugify(segment) || `segmento_${index + 1}`
    const handle = `sim_${slug}_${geo}`
    if (seen.has(handle.toLowerCase())) continue
    seen.add(handle.toLowerCase())
    const keyword = keywords[index % keywords.length] ?? 'cliente'
    leads.push({
      instagramHandle: handle,
      displayName: `${segment} (${config.geography})`,
      bio: `${keyword} · ${segment} · ${config.geography}`,
      niche: segment,
      tags: [segment, keyword, config.geography],
      origin: SIMULATED_ICP_ORIGIN,
      roleGuess: guessRole(segment),
      score: 60 + (index % 20),
    })
  }

  return leads
}
