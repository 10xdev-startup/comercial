import { Router } from 'express'
import { CrmController, SystemController } from '@/controllers/CrmController'
import { crmAuth } from '@/middleware/crmAuth'

const router = Router()
router.use(crmAuth)

router.get('/board', CrmController.board)
router.get('/leads/:id', CrmController.leadDetail)
router.get('/metrics', CrmController.metrics)
router.get('/jobs', CrmController.jobs)
router.get('/config', CrmController.publicConfig)
router.post('/leads/:id/first-dm', CrmController.enqueueFirstDm)

router.get('/status', SystemController.status)
router.post('/pause', SystemController.pause)

export { router as crmRoutes }
