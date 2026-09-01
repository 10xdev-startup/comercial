// Barrel dos middlewares — importe de `@/middleware`.
export { supabaseMiddleware } from '@/middleware/supabaseMiddleware'
export { requireRole, requireAdmin } from '@/middleware/requireRole'
export { errorHandler } from '@/middleware/errorHandler'
