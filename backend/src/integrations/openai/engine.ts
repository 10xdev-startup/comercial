import { loadBusinessConfig } from '@/config/business'
import { findBlockedClaim, type BusinessConfig } from '@/domain/claims'
import { isConversationAction, isConversationIntent, type ConversationAction, type ConversationIntent } from '@/domain/intents'
import { logEvent } from '@/observability/logger'
import type { Lead, Message } from '@/types/crm'

export interface DecisionResult {
  intent: ConversationIntent
  action: ConversationAction
  reply: string | null
  model: string
  promptTokens: number
  completionTokens: number
  estimatedCostUsd: number
}

export type CompleteFn = (input: {
  model: string
  system: string
  user: string
}) => Promise<{ text: string; promptTokens: number; completionTokens: number }>

let completeOverride: CompleteFn | null = null

export function setOpenAiCompleteOverride(fn: CompleteFn | null): void {
  completeOverride = fn
}

export function resetOpenAiCompleteOverride(): void {
  completeOverride = null
}

function envText(name: string, fallback: string): string {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  return raw.trim()
}

function heuristicDecision(text: string, config: BusinessConfig): { intent: ConversationIntent; action: ConversationAction; reply: string | null } {
  const lower = text.toLocaleLowerCase('pt-BR')
  if (/(pare|parar|stop|não quero|nao quero|descadast|opt.?out|me tira)/i.test(lower)) {
    return { intent: 'opt_out', action: 'close', reply: null }
  }
  if (/whatsapp|zap|wpp/.test(lower)) {
    return {
      intent: 'wants_whatsapp',
      action: 'handoff_whatsapp',
      reply: `Perfeito. Segue o WhatsApp da ${config.companyName}: ${config.whatsappLink}`,
    }
  }
  if (/preço|preco|valor|quanto custa/.test(lower)) {
    return {
      intent: 'asked_pricing',
      action: 'present',
      reply: `${config.verifiedClaims[0] ?? config.oneLinePitch}. ${config.revenueModel}`,
    }
  }
  if (/interessad|quero saber|me explica/.test(lower)) {
    return {
      intent: 'interested',
      action: 'present',
      reply: `Aqui é ${config.ownerName}. ${config.oneLinePitch} ${config.verifiedClaims[0] ?? ''}`.trim(),
    }
  }
  if (/não sou o dono|nao sou o dono|sou funcionario|sou funcionário/.test(lower)) {
    return { intent: 'not_the_owner', action: 'ask', reply: 'Sem problema. Quem decide sobre anúncios aí?' }
  }
  return {
    intent: 'ambiguous',
    action: 'ask',
    reply: `Posso te contar como a ${config.companyName} conecta as fontes de anúncio e entrega a análise do período. O que você precisa agora?`,
  }
}

function parseModelJson(text: string): { intent: ConversationIntent; action: ConversationAction; reply: string | null } | null {
  try {
    const json = JSON.parse(text) as Record<string, unknown>
    if (!isConversationIntent(json['intent']) || !isConversationAction(json['action'])) return null
    const reply = json['reply'] === null || json['reply'] === undefined ? null : String(json['reply'])
    return { intent: json['intent'], action: json['action'], reply }
  } catch {
    return null
  }
}

function estimateCostUsd(promptTokens: number, completionTokens: number): number {
  return Number(((promptTokens * 2 + completionTokens * 8) / 1_000_000).toFixed(6))
}

function withWhatsappHandoffLink(
  intent: ConversationIntent,
  action: ConversationAction,
  reply: string | null,
  config: BusinessConfig,
): string | null {
  const handoff = intent === 'wants_whatsapp' || action === 'handoff_whatsapp'
  if (!handoff) return reply
  const link = config.whatsappLink
  if (!reply || !reply.trim()) {
    return `Perfeito. Segue o WhatsApp da ${config.companyName}: ${link}`
  }
  if (reply.includes(link)) return reply
  return `${reply.trim()} ${link}`
}

function sanitizeReply(reply: string | null, config: BusinessConfig): string | null {
  if (reply === null || !reply.trim()) return null
  const blocked = findBlockedClaim(reply, config)
  if (!blocked) return reply.trim()
  logEvent('openai_claim_blocked', { claim: blocked })
  const safe = config.verifiedClaims[0] ?? config.oneLinePitch
  return `Aqui é ${config.ownerName} da ${config.companyName}. ${safe}`
}

async function callOpenAi(system: string, user: string, model: string): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  if (completeOverride) return completeOverride({ model, system, user })
  const apiKey = process.env['OPENAI_API_KEY']
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('openai_unconfigured')
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`openai_http_${res.status}`)
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const text = json.choices?.[0]?.message?.content ?? ''
  return {
    text,
    promptTokens: json.usage?.prompt_tokens ?? 0,
    completionTokens: json.usage?.completion_tokens ?? 0,
  }
}

export async function interpretAndDecide(input: {
  lead: Lead
  messages: Message[]
  inboundText: string
}): Promise<DecisionResult> {
  const config = loadBusinessConfig()
  const model = envText('OPENAI_MODEL_FAST', envText('OPENAI_MODEL', 'gpt-4.1-mini'))
  const heuristic = heuristicDecision(input.inboundText, config)
  const fallback: DecisionResult = {
    intent: heuristic.intent,
    action: heuristic.action,
    reply: withWhatsappHandoffLink(heuristic.intent, heuristic.action, sanitizeReply(heuristic.reply, config), config),
    model: 'heuristic',
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
  }

  const apiKey = process.env['OPENAI_API_KEY']
  if ((!apiKey || apiKey.trim() === '') && !completeOverride) return fallback

  const system = [
    'You decide the next step of a client-funnel Instagram conversation.',
    'Reply JSON only: {"intent":"...","action":"...","reply":"...or null"}',
    `Verified claims only: ${config.verifiedClaims.join(' | ')}`,
    `Never use: ${config.unverifiedClaims.join(' | ')}`,
    `WhatsApp: ${config.whatsappLink}`,
    'No affiliate talk. No invented rates. opt_out => action close, reply null.',
  ].join(' ')
  const history = input.messages
    .slice(-12)
    .map((message) => `${message.direction}:${message.body}`)
    .join('\n')
  const user = `lead=@${input.lead.instagramHandle} pipeline=${input.lead.pipelineState} niche=${input.lead.niche ?? ''} bio=${input.lead.bio ?? ''}\n${history}\ninbound=${input.inboundText}`

  try {
    const completion = await callOpenAi(system, user, model)
    const parsed = parseModelJson(completion.text) ?? heuristic
    return {
      intent: parsed.intent,
      action: parsed.action,
      reply: withWhatsappHandoffLink(parsed.intent, parsed.action, sanitizeReply(parsed.reply, config), config),
      model,
      promptTokens: completion.promptTokens,
      completionTokens: completion.completionTokens,
      estimatedCostUsd: estimateCostUsd(completion.promptTokens, completion.completionTokens),
    }
  } catch (err) {
    logEvent('openai_fallback_heuristic', { error: err instanceof Error ? err.message : 'unknown' })
    return fallback
  }
}
