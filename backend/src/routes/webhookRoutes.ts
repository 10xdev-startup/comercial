import { Router } from 'express'
import { InstagramWebhookController } from '@/controllers/InstagramWebhookController'

const router = Router()

router.get('/instagram', InstagramWebhookController.verify)
router.post('/instagram', InstagramWebhookController.receive)

export { router as webhookRoutes }
