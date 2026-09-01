import { Router } from 'express'
import { CrmController } from '@/controllers/CrmController'
import { crmAuth } from '@/middleware/crmAuth'

const router = Router()

router.use(crmAuth)

router.get('/board', CrmController.board)
router.get('/config', CrmController.publicConfig)
router.get('/jobs', CrmController.jobs)
router.get('/status', CrmController.status)
router.post('/pause', CrmController.pause)
router.get('/experiments', CrmController.listExperiments)
router.post('/experiments', CrmController.createExperiment)
router.post('/experiments/:id/winner', CrmController.declareWinner)
router.post('/leads', CrmController.createLead)
router.get('/leads/:id', CrmController.leadDetail)
router.patch('/leads/:id', CrmController.updateLead)
router.post('/leads/:id/notes', CrmController.addNote)

export { router as crmRoutes }
