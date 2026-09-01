export interface BusinessConfig {
  ownerName: string
  ownerRole: string
  companyName: string
  companyWebsite: string
  instagramHandle: string
  whatsappLink: string
  oneLinePitch: string
  howItWorks: string[]
  revenueModel: string
  marketJargon: Record<string, string>
  verifiedClaims: string[]
  unverifiedClaims: string[]
  icpSegments: string[]
  icpKeywords: string[]
  geography: string
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`business config missing string: ${field}`)
  }
  return value.trim()
}

function asStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`business config missing string[]: ${field}`)
  }
  return value.map((item) => item.trim()).filter(Boolean)
}

function asStringMap(value: unknown, field: string): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`business config missing object: ${field}`)
  }
  const result: Record<string, string> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item !== 'string') throw new Error(`business config jargon must be string: ${field}.${key}`)
    result[key] = item
  }
  return result
}

export function parseBusinessConfig(raw: unknown): BusinessConfig {
  if (!raw || typeof raw !== 'object') throw new Error('business config must be an object')
  const row = raw as Record<string, unknown>
  return {
    ownerName: asString(row['ownerName'], 'ownerName'),
    ownerRole: asString(row['ownerRole'], 'ownerRole'),
    companyName: asString(row['companyName'], 'companyName'),
    companyWebsite: asString(row['companyWebsite'], 'companyWebsite'),
    instagramHandle: asString(row['instagramHandle'], 'instagramHandle'),
    whatsappLink: asString(row['whatsappLink'], 'whatsappLink'),
    oneLinePitch: asString(row['oneLinePitch'], 'oneLinePitch'),
    howItWorks: asStringList(row['howItWorks'], 'howItWorks'),
    revenueModel: asString(row['revenueModel'], 'revenueModel'),
    marketJargon: asStringMap(row['marketJargon'], 'marketJargon'),
    verifiedClaims: asStringList(row['verifiedClaims'], 'verifiedClaims'),
    unverifiedClaims: asStringList(row['unverifiedClaims'], 'unverifiedClaims'),
    icpSegments: asStringList(row['icpSegments'], 'icpSegments'),
    icpKeywords: asStringList(row['icpKeywords'], 'icpKeywords'),
    geography: asString(row['geography'], 'geography'),
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Returns the first unverified claim found in `text`, or null if the copy is allowed. */
export function findBlockedClaim(text: string, config: BusinessConfig): string | null {
  const haystack = text.toLocaleLowerCase('pt-BR')
  for (const claim of config.unverifiedClaims) {
    const needle = claim.trim()
    if (!needle) continue
    const pattern =
      needle.toUpperCase() === needle
        ? new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(needle)}(?:$|[^\\p{L}\\p{N}])`, 'iu')
        : new RegExp(escapeRegExp(needle), 'iu')
    if (pattern.test(haystack) || haystack.includes(needle.toLocaleLowerCase('pt-BR'))) {
      return claim
    }
  }
  return null
}
