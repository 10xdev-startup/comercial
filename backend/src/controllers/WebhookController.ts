import type { Request, Response } from 'express'
import { processInboundMessages } from '@/integrations/instagram/inbound'
import { verifySignature, verifyWebhookChallenge } from '@/integrations/instagram/webhook'
import { AppError } from '@/utils/AppError'
import { sendOk } from '@/utils/apiResponse'

function queryString(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return ''
}

export const WebhookController = {
  verify(req: Request, res: Response): void {
    const challenge = verifyWebhookChallenge({
      mode: queryString(req.query['hub.mode']),
      token: queryString(req.query['hub.verify_token']),
      challenge: queryString(req.query['hub.challenge']),
    })
    if (challenge === null) {
      res.status(403).type('text/plain').send('forbidden')
      return
    }
    res.status(200).type('text/plain').send(challenge)
  },

  async receive(req: Request, res: Response): Promise<void> {
    const signature = req.header('x-hub-signature-256')
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}))
    if (!verifySignature(rawBody, signature)) {
      throw new AppError(401, 'Assinatura invalida', 'INVALID_SIGNATURE')
    }
    const result = await processInboundMessages(req.body)
    sendOk(res, result)
  },
}
