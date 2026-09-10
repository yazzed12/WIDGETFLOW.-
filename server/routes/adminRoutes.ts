import { Router } from 'express';
import { adminService } from '../services/adminService.js';
import { AppError } from '../middleware/errorHandler.js';
import { authorizationService } from '../services/authorizationService.js';
import { roleService } from '../services/roleService.js';
import { cleanupOrphanAssets } from '../services/protectedStorageCleanupService.js';
import { executeFactoryReset } from '../services/factoryResetService.js';

export const adminRouter = Router();

adminRouter.post('/admin/data-control/system-reset', async (req: any, res, next) => {
  try {
    const result = await executeFactoryReset(req.headers.authorization, req.body?.confirmation, req.body?.options);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// Middleware: Require Protected Admin for Admin Routes
function requireAdminRole(req: any, res: any, next: any) {
  const user = req.user;

  const isProtectedAdmin = Boolean(
    user &&
    user.status === 'Active' &&
    user.roleActive === true &&
    user.roleKey === 'admin' &&
    user.roleType === 'System' &&
    user.roleProtected === true
  );

  if (!isProtectedAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message:
          'Admin authorization required to access platform management resources.',
      },
    });
  }

  next();
}

// 1. GET /api/system/config
adminRouter.get('/system/config', (_req, res) => {
  const config = adminService.getEffectiveConfig();

  res.json({
    success: true,
    data: config,
  });
});

// Admin-Protected Routes Below
adminRouter.use('/admin', requireAdminRole);

// PHASE 066 — Protected Storage Cleanup
adminRouter.post(
  '/admin/data-control/assets/cleanup',
  async (req: any, res, next) => {
    try {
      console.log('066 auth header check:', {
        present: Boolean(req.headers.authorization),
        startsWithBearer:
          typeof req.headers.authorization === 'string' &&
          /^Bearer\s+/i.test(req.headers.authorization),
        type: typeof req.headers.authorization,
      });

      const result = await cleanupOrphanAssets({
        assetIds: req.body?.assetIds,
        confirmation: req.body?.confirmation,
        authorization: req.headers.authorization,
      });

      if (result.status !== 'completed') {
        const blocked = result.status === 'blocked' || result.status === 'reconciliation_required';
        return res.status(blocked ? 409 : 502).json({
          success: false,
          error: {
            code: blocked ? 'ASSET_CLEANUP_BLOCKED' : 'ASSET_CLEANUP_FAILED',
            message: blocked
              ? 'Selected assets cannot be fully cleaned up.'
              : 'Asset cleanup failed.',
            details: result,
          },
        });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/admin/config
adminRouter.get('/admin/config', (_req, res) => {
  const config = adminService.getEffectiveConfig();

  res.json({
    success: true,
    data: config,
  });
});

// GET /api/admin/features
adminRouter.get('/admin/features', (_req, res) => {
  const features = adminService.getFeatures();

  res.json({
    success: true,
    data: features,
  });
});

// PATCH /api/admin/features/:featureKey
adminRouter.patch('/admin/features/:featureKey', (req: any, res) => {
  const { enabled } = req.body || {};

  if (enabled === undefined) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: '"enabled" boolean state required.',
      },
    });
  }

  const featureKey = req.params.featureKey;

  const updated = adminService.updateFeature(
    featureKey,
    Boolean(enabled),
    req.user
  );

  res.json({
    success: true,
    data: updated,
  });
});

// GET /api/admin/elements
adminRouter.get('/admin/elements', (_req, res) => {
  const elements = adminService.getElements();

  res.json({
    success: true,
    data: elements,
  });
});

// PATCH /api/admin/elements/:elementKey
adminRouter.patch('/admin/elements/:elementKey', (req: any, res) => {
  const { enabled } = req.body || {};

  if (enabled === undefined) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: '"enabled" boolean state required.',
      },
    });
  }

  const elementKey = req.params.elementKey;

  const updated = adminService.updateElement(
    elementKey,
    Boolean(enabled),
    req.user
  );

  res.json({
    success: true,
    data: updated,
  });
});

// GET /api/admin/users
adminRouter.get('/admin/users', (_req, res) => {
  const users = adminService.getUsers();

  res.json({
    success: true,
    data: users,
  });
});

// POST /api/admin/users
adminRouter.post('/admin/users', (req: any, res) => {
  const {
    name,
    email,
    role,
    roleId,
    department,
  } = req.body || {};

  const newUser = adminService.createUser(
    {
      name,
      email,
      role,
      roleId,
      department,
    },
    req.user
  );

  res.json({
    success: true,
    data: newUser,
  });
});

// PATCH /api/admin/users/:id/status
adminRouter.patch('/admin/users/:id/status', (req: any, res) => {
  const { status } = req.body || {};

  if (
    !status ||
    !['Active', 'Inactive', 'Resigned', 'Terminated'].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid account status.',
      },
    });
  }

  const updated = adminService.updateUserStatus(
    req.params.id,
    status,
    req.user
  );

  res.json({
    success: true,
    data: updated,
  });
});

// PATCH /api/admin/users/:id
adminRouter.patch('/admin/users/:id', (req: any, res) => {
  const {
    name,
    email,
    department,
    role,
    roleId,
    status,
  } = req.body || {};

  const updated = adminService.updateUser(
    req.params.id,
    {
      name,
      email,
      department,
      role,
      roleId,
      status,
    },
    req.user
  );

  res.json({
    success: true,
    data: updated,
  });
});

// Organizational Roles & Permissions
adminRouter.get('/admin/roles', (_req, res) => {
  res.json({
    success: true,
    data: roleService.getRoles(),
  });
});

adminRouter.get('/admin/roles-assignable', (_req, res) => {
  res.json({
    success: true,
    data: roleService.getAssignableRoles(),
  });
});

adminRouter.post('/admin/roles', (req: any, res) => {
  res.json({
    success: true,
    data: roleService.createRole(req.body || {}, req.user),
  });
});

adminRouter.put('/admin/roles/:id', (req: any, res) => {
  res.json({
    success: true,
    data: roleService.updateRole(
      req.params.id,
      req.body || {},
      req.user
    ),
  });
});

adminRouter.post(
  '/admin/roles/:id/duplicate',
  (req: any, res) => {
    res.json({
      success: true,
      data: roleService.duplicateRole(
        req.params.id,
        req.body?.name,
        req.user
      ),
    });
  }
);

adminRouter.post(
  '/admin/roles/:id/restore-defaults',
  (req: any, res) => {
    res.json({
      success: true,
      data: roleService.restoreDefaultRolePermissions(
        req.params.id,
        req.user
      ),
    });
  }
);

// Governance Routing
adminRouter.get('/admin/governance-routing', (_req, res) => {
  res.json({
    success: true,
    data: adminService.getGovernanceRouting(),
  });
});

adminRouter.put(
  '/admin/governance-routing',
  (req: any, res) => {
    res.json({
      success: true,
      data: adminService.updateGovernanceRouting(
        req.body || {},
        req.user
      ),
    });
  }
);

// GET /api/admin/categories
adminRouter.get('/admin/categories', (_req, res) => {
  const categories = adminService.getCategories();

  res.json({
    success: true,
    data: categories,
  });
});

// POST /api/admin/categories
adminRouter.post('/admin/categories', (req: any, res) => {
  const { name, description } = req.body || {};

  const newCat = adminService.createCategory(
    {
      name,
      description,
    },
    req.user
  );

  res.json({
    success: true,
    data: newCat,
  });
});

// PATCH /api/admin/categories/:id
adminRouter.patch('/admin/categories/:id', (req: any, res) => {
  const {
    name,
    description,
    status,
  } = req.body || {};

  const updated = adminService.updateCategory(
    req.params.id,
    {
      name,
      description,
      status,
    },
    req.user
  );

  res.json({
    success: true,
    data: updated,
  });
});

// GET /api/admin/audit
adminRouter.get('/admin/audit', (_req, res) => {
  const audit = adminService.getAuditLog();

  res.json({
    success: true,
    data: audit,
  });
});

// PATCH /api/admin/settings
adminRouter.patch('/admin/settings', (req: any, res) => {
  const settings = req.body || {};

  const updated = adminService.updateSettings(
    settings,
    req.user
  );

  res.json({
    success: true,
    data: updated,
  });
});

// Admin Pack Management
adminRouter.get('/admin/packs', (_req, res) => {
  const packs = adminService.getPacks();

  res.json({
    success: true,
    data: packs,
  });
});

adminRouter.get('/admin/packs/:id', (req, res) => {
  const pack = adminService.getPackById(req.params.id);

  if (!pack) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Pack not found',
      },
    });
  }

  res.json({
    success: true,
    data: pack,
  });
});

adminRouter.post('/admin/packs', (req: any, res) => {
  try {
    const {
      name,
      description,
      categoryId,
      status,
      items,
      structure,
    } = req.body || {};

    const newPack = adminService.createPack(
      {
        name,
        description,
        categoryId,
        status,
        items,
        structure,
      },
      req.user
    );

    res.json({
      success: true,
      data: newPack,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: err.message,
      },
    });
  }
});

adminRouter.put('/admin/packs/:id', (req: any, res) => {
  try {
    const {
      name,
      description,
      categoryId,
      status,
      items,
      structure,
    } = req.body || {};

    const updated = adminService.updatePack(
      req.params.id,
      {
        name,
        description,
        categoryId,
        status,
        items,
        structure,
      },
      req.user
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: err.message,
      },
    });
  }
});

adminRouter.post(
  '/admin/packs/:id/publish',
  (req: any, res) => {
    const published = adminService.publishPack(
      req.params.id,
      req.user
    );

    res.json({
      success: true,
      data: published,
    });
  }
);

adminRouter.patch(
  '/admin/packs/:id/status',
  (req: any, res) => {
    const { status } = req.body || {};

    if (
      !status ||
      !['Draft', 'Published', 'Disabled'].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message:
            'Status must be Draft, Published, or Disabled.',
        },
      });
    }

    const updated = adminService.updatePackStatus(
      req.params.id,
      status,
      req.user
    );

    res.json({
      success: true,
      data: updated,
    });
  }
);

// Admin Content Library
adminRouter.get(
  '/admin/content-library',
  (_req, res) => {
    const items =
      adminService.getContentLibraryItems();

    res.json({
      success: true,
      data: items,
    });
  }
);

adminRouter.post(
  '/admin/content-library',
  (req: any, res) => {
    const {
      name,
      description,
      category,
      contentType,
      contentValue,
    } = req.body || {};

    const newItem = adminService.createContentItem(
      {
        name,
        description,
        category,
        contentType,
        contentValue,
      },
      req.user
    );

    res.json({
      success: true,
      data: newItem,
    });
  }
);

adminRouter.put(
  '/admin/content-library/:id',
  (req: any, res) => {
    const {
      name,
      description,
      category,
      contentType,
      contentValue,
      enabled,
    } = req.body || {};

    const updated =
      adminService.updateContentItem(
        req.params.id,
        {
          name,
          description,
          category,
          contentType,
          contentValue,
          enabled,
        },
        req.user
      );

    res.json({
      success: true,
      data: updated,
    });
  }
);

adminRouter.patch(
  '/admin/content-library/:id/status',
  (req: any, res) => {
    const { enabled } = req.body || {};

    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Boolean enabled field required.',
        },
      });
    }

    const updated =
      adminService.updateContentItemStatus(
        req.params.id,
        Boolean(enabled),
        req.user
      );

    res.json({
      success: true,
      data: updated,
    });
  }
);
