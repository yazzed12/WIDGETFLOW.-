import { Router } from 'express';
import { cleanupOrphanAssets } from '../services/protectedStorageCleanupService.js';
import { executeFactoryReset } from '../services/factoryResetService.js';

export const canonicalAdminRouter = Router();

canonicalAdminRouter.post('/admin/data-control/system-reset', async (req: any, res, next) => {
  try {
    const result = await executeFactoryReset(req.headers.authorization, req.body?.confirmation, req.body?.options);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

canonicalAdminRouter.post('/admin/data-control/assets/cleanup', async (req: any, res, next) => {
  try {
    const result = await cleanupOrphanAssets({ assetIds: req.body?.assetIds, confirmation: req.body?.confirmation, authorization: req.headers.authorization });
    if (result.status !== 'completed') {
      const blocked = result.status === 'blocked' || result.status === 'reconciliation_required';
      return res.status(blocked ? 409 : 502).json({ success: false, error: { code: blocked ? 'ASSET_CLEANUP_BLOCKED' : 'ASSET_CLEANUP_FAILED', message: blocked ? 'Selected assets cannot be fully cleaned up.' : 'Asset cleanup failed.', details: result } });
    }
    return res.json({ success: true, data: result });
  } catch (error) { next(error); }
});
