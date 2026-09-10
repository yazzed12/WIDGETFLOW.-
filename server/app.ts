import express from 'express';
import cors from 'cors';
import { AppError, errorHandler } from './middleware/errorHandler.js';
import { createIdentityMiddleware } from './middleware/identity.js';
import { createOriginProtection } from './middleware/security.js';
import { getSecurityConfig, type SecurityConfig } from './config/securityConfig.js';
import { canonicalAdminRouter } from './routes/canonicalAdminRoutes.js';
import { assetRouter } from './routes/assetRoutes.js';
import { intakeRoutes } from './routes/intakeRoutes.js';
import { mountLegacyRuntime } from './legacy/legacyWiring.js';

export type CreateAppOptions = { initializeDatabase?: boolean; security?: SecurityConfig };

export function createApp(options: CreateAppOptions = {}) {
  const security = options.security || getSecurityConfig();
  const app = express();
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || security.clientOrigins.includes(origin)) return callback(null, true);
      callback(new AppError('Request origin is not allowed.', 403, 'ORIGIN_NOT_ALLOWED'));
    },
  }));
  app.use(express.json({ limit: '10mb' }));
  app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() }));

  if (security.isProduction) {
    app.all('/api/demo/reset', (_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } }));
  }
  app.use('/api', createOriginProtection(security));
  app.use('/api', createIdentityMiddleware(security));

  if (security.legacySqliteEnabled) {
    void mountLegacyRuntime(app, security);
  } else {
    app.use('/api', canonicalAdminRouter);
    app.use('/api/assets', assetRouter);
    app.use('/api', intakeRoutes);
  }
  app.use(errorHandler);
  return app;
}
