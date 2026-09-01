import { Router } from 'express'
import { WebhookController } from '@/controllers/WebhookController'

const router = Router()

router.get('/instagram', WebhookController.verify)
router.post('/instagram', WebhookController.receive)

export { router as webhookRoutes }
