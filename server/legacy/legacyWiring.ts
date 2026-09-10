import type { Express } from 'express';
import type { SecurityConfig } from '../config/securityConfig.js';

export async function mountLegacyRuntime(app: Express, security: SecurityConfig) {
  const [{ db, initDatabase }, { ensureSystemRoles, seedDatabase }, { apiRouter }, authModule, demoModule, authConfigModule] = await Promise.all([
    import('../db/database.js'),
    import('../db/seed.js'),
    import('../routes/apiRouter.js'),
    import('../routes/authRoutes.js'),
    import('../controllers/notificationController.js'),
    import('../auth/authConfig.js'),
  ]);
  initDatabase();
  ensureSystemRoles();
  const hasUsers = Number((db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count || 0) > 0;
  if (!hasUsers) seedDatabase();
  const authRouters = authModule.createAuthRouters(authConfigModule.getAuthConfig(security.nodeEnv), security);
  app.use('/api/auth', authRouters.publicRouter);
  app.use('/api/auth', authRouters.protectedRouter);
  app.use('/api', apiRouter);
  if (security.demoIdentityEnabled) {
    const { authorizationService } = await import('../services/authorizationService.js');
    app.post('/api/demo/reset', (req: any, _res, next) => { try { authorizationService.requireAdmin(req.user); next(); } catch (error) { next(error); } }, demoModule.demoController.resetDemo);
  }
}
