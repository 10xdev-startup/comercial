import type { Request, Response } from 'express'
import { sendError } from '@/utils/apiResponse'
import { verifyMetaSignature } from '@/integrations/instagram/signature'
import { ingestWebhookPayload } from '@/worker/handlers'

function rawBody(req: Request): Buffer {
  const extra = req as Request & { rawBody?: Buffer }
  if (extra.rawBody) return extra.rawBody
  return Buffer.from(JSON.stringify(req.body ?? {}))
}

export const InstagramWebhookController = {
  /** Meta subscription handshake — plain text challenge, not the API envelope. */
  verify(req: Request, res: Response): void {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    const expected = process.env['INSTAGRAM_WEBHOOK_VERIFY_TOKEN']
    if (mode === 'subscribe' && expected && token === expected && typeof challenge === 'string') {
      res.status(200).type('text/plain').send(challenge)
      return
    }
    if (mode === 'subscribe' && !expected && typeof challenge === 'string') {
      res.status(200).type('text/plain').send(challenge)
      return
    }
    sendError(res, 403, 'Webhook verify token invalido', 'WEBHOOK_VERIFY_FAILED')
  },

  async receive(req: Request, res: Response): Promise<void> {
    const secret = process.env['INSTAGRAM_APP_SECRET'] ?? ''
    const signature = req.header('x-hub-signature-256') ?? req.header('X-Hub-Signature-256')
    if (secret && !verifyMetaSignature(rawBody(req), signature, secret)) {
      sendError(res, 401, 'Assinatura do webhook invalida', 'WEBHOOK_SIGNATURE_INVALID')
      return
    }
    const result = await ingestWebhookPayload(req.body)
    res.status(200).json({ success: true, data: result })
  },
}
