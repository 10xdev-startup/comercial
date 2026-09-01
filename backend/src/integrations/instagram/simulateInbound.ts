import { randomUUID } from 'crypto'
import { parseIgsid, processInboundMessages } from '@/integrations/instagram/inbound'
import type { Lead } from '@/types/crm'

export const INBOUND_SCENARIOS = ['question', 'opt_in', 'opt_out', 'restriction'] as const
export type InboundScenario = (typeof INBOUND_SCENARIOS)[number]

const SCENARIO_TEXT: Record<Exclude<InboundScenario, 'restriction'>, string> = {
  question: 'qual o preco do plano?',
  opt_in: 'me passa o zap',
  opt_out: 'pare de me enviar',
}

export function isInboundScenario(value: unknown): value is InboundScenario {
  return typeof value === 'string' && (INBOUND_SCENARIOS as readonly string[]).includes(value)
}

export function buildSimulatedWebhookPayload(input: {
  scenario: InboundScenario
  handle: string
  senderId: string
  mid: string
}): unknown {
  if (input.scenario === 'restriction') {
    return {
      entry: [
        {
          changes: [
            {
              field: 'restriction',
              value: { sender_id: input.senderId, text: 'simulated_restriction' },
            },
          ],
        },
      ],
    }
  }
  return {
    object: 'instagram',
    entry: [
      {
        messaging: [
          {
            sender: { id: input.senderId, username: input.handle },
            message: { mid: input.mid, text: SCENARIO_TEXT[input.scenario] },
          },
        ],
      },
    ],
  }
}

export async function simulateInboundForLead(
  lead: Lead,
  scenario: InboundScenario,
  now: Date = new Date(),
): Promise<{ processed: number; duplicates: number; restrictions: number; scenario: InboundScenario; mid: string }> {
  const senderId = parseIgsid(lead.origin) ?? `sim:${lead.id}`
  const mid = `sim:${randomUUID()}`
  const payload = buildSimulatedWebhookPayload({
    scenario,
    handle: lead.instagramHandle,
    senderId,
    mid,
  })
  const result = await processInboundMessages(payload, now)
  return { ...result, scenario, mid }
}
