import { logEvent } from '@/observability/logger'

export interface GraphSendResult {
  id: string
  stub: boolean
}

function envText(name: string): string | null {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return null
  return raw.trim()
}

export function graphApiConfigured(): boolean {
  return envText('INSTAGRAM_PAGE_ACCESS_TOKEN') !== null && envText('INSTAGRAM_BUSINESS_ACCOUNT_ID') !== null
}

export async function sendOfficialReply(input: {
  igsid: string
  text: string
}): Promise<GraphSendResult> {
  const token = envText('INSTAGRAM_PAGE_ACCESS_TOKEN')
  const accountId = envText('INSTAGRAM_BUSINESS_ACCOUNT_ID')
  if (!token || !accountId) {
    logEvent('graph_send_stub', { igsid: input.igsid, chars: input.text.length })
    return { id: `stub:${input.igsid}:${Date.now()}`, stub: true }
  }
  const url = `https://graph.facebook.com/v21.0/${accountId}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: input.igsid },
      message: { text: input.text },
    }),
  })
  if (!res.ok) {
    throw new Error(`graph_api_error:${res.status}`)
  }
  const json = (await res.json()) as { id?: string }
  return { id: json.id ?? `graph:${Date.now()}`, stub: false }
}
