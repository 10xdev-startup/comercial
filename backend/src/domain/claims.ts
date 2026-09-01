export interface BusinessConfig {
  ownerName: string
  ownerRole: string
  companyName: string
  companyWebsite: string
  instagramHandle: string
  whatsappLink: string
  affiliateGroupLink: string
  oneLinePitch: string
  howItWorks: string[]
  revenueModel: string
  marketJargon: Record<string, string>
  verifiedClaims: string[]
  unverifiedClaims: string[]
  icpSegments: string[]
  icpKeywords: string[]
  affiliateTopics: string[]
  geography: string
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asJargon(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === 'string') out[key] = val
  }
  return out
}

export function parseBusinessConfig(raw: unknown): BusinessConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    ownerName: typeof obj['ownerName'] === 'string' ? obj['ownerName'] : '',
    ownerRole: typeof obj['ownerRole'] === 'string' ? obj['ownerRole'] : '',
    companyName: typeof obj['companyName'] === 'string' ? obj['companyName'] : '',
    companyWebsite: typeof obj['companyWebsite'] === 'string' ? obj['companyWebsite'] : '',
    instagramHandle: typeof obj['instagramHandle'] === 'string' ? obj['instagramHandle'] : '',
    whatsappLink: typeof obj['whatsappLink'] === 'string' ? obj['whatsappLink'] : '',
    affiliateGroupLink: typeof obj['affiliateGroupLink'] === 'string' ? obj['affiliateGroupLink'] : '',
    oneLinePitch: typeof obj['oneLinePitch'] === 'string' ? obj['oneLinePitch'] : '',
    howItWorks: asStringArray(obj['howItWorks']),
    revenueModel: typeof obj['revenueModel'] === 'string' ? obj['revenueModel'] : '',
    marketJargon: asJargon(obj['marketJargon']),
    verifiedClaims: asStringArray(obj['verifiedClaims']),
    unverifiedClaims: asStringArray(obj['unverifiedClaims']),
    icpSegments: asStringArray(obj['icpSegments']),
    icpKeywords: asStringArray(obj['icpKeywords']),
    affiliateTopics: asStringArray(obj['affiliateTopics']),
    geography: typeof obj['geography'] === 'string' ? obj['geography'] : '',
  }
}

/** Blocks copy that repeats an unverified claim (exact phrase, case-insensitive). */
export function findBlockedClaim(text: string, config: BusinessConfig): string | null {
  const haystack = text.toLowerCase()
  for (const claim of config.unverifiedClaims) {
    const needle = claim.trim().toLowerCase()
    if (needle && haystack.includes(needle)) return claim
  }
  return null
}
