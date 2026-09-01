import { Router } from 'express'
import { UserController } from '@/controllers/UserController'
import { supabaseMiddleware } from '@/middleware'

const router = Router()

// Todas as rotas de /users exigem autenticacao (injeta req.user).
router.use(supabaseMiddleware)

router.get('/me', UserController.me)
router.patch('/me', UserController.updateMe)
router.post('/onboard', UserController.onboard)

// Exemplo de rota protegida por papel — descomente quando tiver um handler admin:
//   import { requireAdmin } from '@/middleware'
//   router.get('/admin/stats', requireAdmin, AdminController.stats)

export { router as userRoutes }
