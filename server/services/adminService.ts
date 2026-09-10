import { db } from '../db/database.js';
import { authorizationService } from './authorizationService.js';
import { roleService } from './roleService.js';
import { AppError } from '../middleware/errorHandler.js';

export interface AdminFeatureSetting {
  feature_key: string;
  feature_name: string;
  category: string;
  description: string;
  enabled: boolean;
  updated_by?: string;
  updated_at?: string;
}

export interface AdminElementSetting {
  element_key: string;
  element_name: string;
  category: string;
  description: string;
  enabled: boolean;
  updated_by?: string;
  updated_at?: string;
}

export interface AdminAuditEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  target: string;
  previous_value?: string;
  new_value?: string;
  timestamp: string;
}

class AdminService {
  private requireAdmin(actorUser: any) {
    return authorizationService.requireAdmin(actorUser);
  }

  // Public effective config for all users
  getEffectiveConfig() {
    const featuresRows = db.prepare(`SELECT feature_key, enabled FROM system_feature_settings`).all() as any[];
    const elementsRows = db.prepare(`SELECT element_key, enabled FROM system_element_settings`).all() as any[];
    const settingsRows = db.prepare(`SELECT setting_key, setting_value, setting_type FROM system_general_settings`).all() as any[];

    const features: Record<string, boolean> = {};
    featuresRows.forEach((r) => {
      features[r.feature_key] = Boolean(r.enabled);
    });

    const elements: Record<string, boolean> = {};
    elementsRows.forEach((r) => {
      elements[r.element_key] = Boolean(r.enabled);
    });

    const settings: Record<string, any> = {};
    settingsRows.forEach((r) => {
      if (r.setting_type === 'boolean') {
        settings[r.setting_key] = r.setting_value === 'true' || r.setting_value === '1';
      } else if (r.setting_type === 'number') {
        settings[r.setting_key] = Number(r.setting_value);
      } else {
        settings[r.setting_key] = r.setting_value;
      }
    });

    // Provide dual alias keys for workflow settings
    settings['workflow.report_rejection'] = settings['allow_rejection'] ?? true;
    settings['workflow.return_for_changes'] = settings['allow_return'] ?? true;
    settings['workflow.digital_signature'] = settings['digital_signature'] ?? true;
    settings['workflow.template_governance'] = settings['template_governance'] ?? true;

    return { features, elements, settings };
  }

  // Admin Feature Management
  getFeatures(): any[] {
    const rows = db.prepare(`SELECT * FROM system_feature_settings ORDER BY category, feature_name`).all() as any[];
    return rows.map((r) => ({
      feature_key: r.feature_key,
      featureKey: r.feature_key,
      feature_name: r.feature_name,
      name: r.feature_name,
      category: r.category,
      description: r.description || '',
      enabled: Boolean(r.enabled),
      updated_by: r.updated_by,
      updated_at: r.updated_at,
    }));
  }

  updateFeature(featureKey: string, enabled: boolean, actorUser: any) {
    const prev = db.prepare(`SELECT * FROM system_feature_settings WHERE feature_key = ?`).get(featureKey) as any;
    if (!prev) throw new Error(`Feature "${featureKey}" not found.`);

    const prevVal = prev.enabled ? 'Enabled' : 'Disabled';
    const newVal = enabled ? 'Enabled' : 'Disabled';

    db.prepare(`
      UPDATE system_feature_settings
      SET enabled = ?, updated_by = ?, updated_at = datetime('now')
      WHERE feature_key = ?
    `).run(enabled ? 1 : 0, actorUser.id, featureKey);

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: enabled ? 'Enabled Studio Feature' : 'Disabled Studio Feature',
      target: prev.feature_name || featureKey,
      previousValue: prevVal,
      newValue: newVal,
    });

    return this.getFeatures().find((f) => f.feature_key === featureKey);
  }

  // Admin Element Management
  getElements(): any[] {
    const rows = db.prepare(`SELECT * FROM system_element_settings ORDER BY category, element_name`).all() as any[];
    return rows.map((r) => ({
      element_key: r.element_key,
      elementKey: r.element_key,
      element_name: r.element_name,
      name: r.element_name,
      category: r.category,
      description: r.description || '',
      enabled: Boolean(r.enabled),
      updated_by: r.updated_by,
      updated_at: r.updated_at,
    }));
  }

  updateElement(elementKey: string, enabled: boolean, actorUser: any) {
    const prev = db.prepare(`SELECT * FROM system_element_settings WHERE element_key = ?`).get(elementKey) as any;
    if (!prev) throw new Error(`Element "${elementKey}" not found.`);

    const prevVal = prev.enabled ? 'Enabled' : 'Disabled';
    const newVal = enabled ? 'Enabled' : 'Disabled';

    db.prepare(`
      UPDATE system_element_settings
      SET enabled = ?, updated_by = ?, updated_at = datetime('now')
      WHERE element_key = ?
    `).run(enabled ? 1 : 0, actorUser.id, elementKey);

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: enabled ? 'Enabled Element' : 'Disabled Element',
      target: prev.element_name || elementKey,
      previousValue: prevVal,
      newValue: newVal,
    });

    return this.getElements().find((e) => e.element_key === elementKey);
  }

  // Admin Users & Access
  getUsers() {
    const rows = db.prepare(`SELECT id, created_at as createdAt FROM users ORDER BY name`).all() as any[];
    return rows.map((row) => ({ ...authorizationService.resolveUser(row.id), createdAt: row.createdAt }));
  }

  updateUser(
    userId: string,
    updates: { name?: string; email?: string; department?: string; role?: string; roleId?: string; status?: string },
    actorUser: any
  ) {
    this.requireAdmin(actorUser);
    const prev = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as any;
    if (!prev) throw new Error(`User "${userId}" not found.`);

    const previousResolved = authorizationService.resolveUser(userId);
    if (authorizationService.isProtectedAdmin(previousResolved) || userId === actorUser.id) {
      throw new Error('This Admin account is system protected and cannot be modified here.');
    }

    const validStatuses = new Set(['Active', 'Inactive', 'Resigned', 'Terminated']);
    if (updates.status !== undefined && !validStatuses.has(updates.status)) throw new Error('Invalid account status.');

    // Safeguard 2: Users & Access Dependency Protection
    const targetStatus = updates.status ?? prev.status ?? 'Active';
    const targetRoleIdInput = updates.roleId ?? (updates.role ? (db.prepare(`SELECT id FROM roles WHERE id = ? OR (role_type = 'System' AND name = ?)`).get(updates.role, updates.role) as any)?.id : prev.role_id);
    const isDeactivatingOrChangingRole = targetStatus !== 'Active' || (targetRoleIdInput && targetRoleIdInput !== prev.role_id);

    if (isDeactivatingOrChangingRole) {
      const routing = this.getGovernanceRouting().routes;
      const activeRoutes = [
        { label: 'Employee', route: routing.employee },
        { label: 'Manager', route: routing.manager },
        { label: 'Director', route: routing.director },
      ];

      for (const lvl of activeRoutes) {
        if (!lvl.route || lvl.route.isDirectPublish || lvl.route.id === 'DIRECT_PUBLISH') continue;

        // 1. Specific User Guard
        if (lvl.route.strategy === 'SPECIFIC_USER' && lvl.route.specificUserId === userId) {
          throw new Error(`${prev.name} is the configured reviewer for ${lvl.label}-level Template Governance. Update the governance route before changing this user's role or status.`);
        }

        // 2. Role Queue Last User Guard
        if (lvl.route.strategy === 'ROLE_QUEUE' && lvl.route.id === prev.role_id) {
          const remainingActiveUsers = this.getUsers().filter(
            (u: any) => u.status === 'Active' && u.roleId === prev.role_id && u.id !== userId
          );
          if (remainingActiveUsers.length === 0) {
            throw new Error(`This change would leave the ${lvl.label}-level Template Governance Role Queue without any active eligible reviewers.`);
          }
        }
      }
    }

    let selectedRole: any;
    if (updates.roleId !== undefined) {
      selectedRole = db.prepare(`SELECT * FROM roles WHERE id = ? AND key != 'admin'`).get(updates.roleId) as any;
    } else if (updates.role !== undefined) {
      selectedRole = db.prepare(`SELECT * FROM roles WHERE (id = ? OR (role_type = 'System' AND name = ?)) AND key != 'admin'`).get(updates.role, updates.role) as any;
    } else {
      selectedRole = (prev.role_id
        ? db.prepare(`SELECT * FROM roles WHERE id = ?`).get(prev.role_id)
        : db.prepare(`SELECT * FROM roles WHERE role_type = 'System' AND name = ?`).get(prev.role)) as any;
    }
    if (!selectedRole) throw new Error('Invalid role assignment.');
    if (!selectedRole.is_active) throw new Error('Inactive roles cannot be assigned to users.');

    const name = updates.name !== undefined ? updates.name.trim() : prev.name;
    const email = updates.email !== undefined ? updates.email.trim() : prev.email;
    const department = updates.department !== undefined ? updates.department.trim() : prev.department;
    const status = updates.status ?? prev.status ?? 'Active';
    if (status === 'Active' && !selectedRole.is_active) throw new Error('A user cannot be activated while assigned to an inactive role.');
    const legacyRole = selectedRole.role_type === 'System' ? selectedRole.name : 'Employee';
    if (!name || !email || !department) throw new Error('Name, email, and department are required.');

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE users SET name = ?, email = ?, department = ?, role = ?, role_id = ?, status = ? WHERE id = ?
      `).run(name, email, department, legacyRole, selectedRole.id, status, userId);

      if (previousResolved?.roleId !== selectedRole.id) {
        this.logAudit({
          actorId: actorUser.id,
          actorName: actorUser.name,
          actorRole: actorUser.role,
          action: 'USER_ROLE_CHANGED',
          target: prev.name,
          previousValue: previousResolved?.role || prev.role,
          newValue: selectedRole.name,
        });
      }
      if ((prev.status || 'Active') !== status) {
        this.logAudit({
          actorId: actorUser.id,
          actorName: actorUser.name,
          actorRole: actorUser.role,
          action: 'USER_STATUS_CHANGED',
          target: prev.name,
          previousValue: prev.status || 'Active',
          newValue: status,
        });
      }
      if (prev.name !== name || prev.email !== email || prev.department !== department) {
        this.logAudit({
          actorId: actorUser.id,
          actorName: actorUser.name,
          actorRole: actorUser.role,
          action: 'USER_DETAILS_CHANGED',
          target: prev.name,
          previousValue: `${prev.name} | ${prev.email} | ${prev.department}`,
          newValue: `${name} | ${email} | ${department}`,
        });
      }
    });
    transaction();
    return this.getUsers().find((u) => u.id === userId);
  }

  updateUserStatus(userId: string, status: 'Active' | 'Inactive' | 'Resigned' | 'Terminated', actorUser: any) {
    return this.updateUser(userId, { status }, actorUser);
  }

  createUser(userData: { id?: string; name: string; email: string; role?: string; roleId?: string; department: string }, actorUser: any) {
    this.requireAdmin(actorUser);
    if (!userData.name || !userData.email || (!userData.role && !userData.roleId) || !userData.department) {
      throw new Error('All user fields (name, email, role, department) are required.');
    }
    const selectedRole = userData.roleId
      ? db.prepare(`SELECT * FROM roles WHERE id = ? AND is_active = 1 AND key != 'admin'`).get(userData.roleId) as any
      : db.prepare(`SELECT * FROM roles WHERE role_type = 'System' AND name = ? AND is_active = 1 AND key != 'admin'`).get(userData.role) as any;
    if (!selectedRole) throw new Error('Select an active operational role.');
    const legacyRole = selectedRole.role_type === 'System' ? selectedRole.name : 'Employee';

    const userId = userData.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const initials = userData.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const bgColors = ['bg-indigo-600', 'bg-emerald-600', 'bg-purple-600', 'bg-blue-600', 'bg-amber-600'];
    const avatarBg = bgColors[Math.floor(Math.random() * bgColors.length)];

    db.prepare(`
      INSERT INTO users (id, name, email, role, role_id, avatar_initials, avatar_bg, department, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
    `).run(userId, userData.name, userData.email, legacyRole, selectedRole.id, initials, avatarBg, userData.department);

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: 'Created User',
      target: userData.name,
      previousValue: 'Non-existent',
      newValue: `${selectedRole.name} (${userData.department})`,
    });

    return this.getUsers().find((u) => u.id === userId);
  }

  // Admin Categories
  getCategories() {
    const rows = db.prepare(`SELECT * FROM report_template_categories ORDER BY name`).all() as any[];
    const counts = db.prepare(`SELECT category_id, COUNT(*) as cnt FROM report_templates GROUP BY category_id`).all() as any[];
    const countMap = new Map<string, number>();
    counts.forEach((c) => countMap.set(c.category_id, c.cnt));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status || 'Active',
      templateCount: countMap.get(r.id) || 0,
      createdAt: r.created_at,
    }));
  }

  createCategory(catData: { name: string; description: string }, actorUser: any) {
    if (!catData.name || !catData.name.trim()) {
      throw new Error('Category name is required.');
    }
    const catId = `cat-${Date.now()}`;
    db.prepare(`
      INSERT INTO report_template_categories (id, name, description, status)
      VALUES (?, ?, ?, 'Active')
    `).run(catId, catData.name.trim(), catData.description || '');

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: 'Created Category',
      target: catData.name.trim(),
      previousValue: 'Non-existent',
      newValue: 'Active Category',
    });

    return this.getCategories().find((c) => c.id === catId);
  }

  updateCategory(catId: string, updates: { name?: string; description?: string; status?: 'Active' | 'Inactive' }, actorUser: any) {
    const prev = db.prepare(`SELECT * FROM report_template_categories WHERE id = ?`).get(catId) as any;
    if (!prev) throw new Error(`Category "${catId}" not found.`);

    const newName = updates.name !== undefined ? updates.name.trim() : prev.name;
    const newDesc = updates.description !== undefined ? updates.description : prev.description;
    const newStatus = updates.status !== undefined ? updates.status : prev.status || 'Active';

    db.prepare(`
      UPDATE report_template_categories
      SET name = ?, description = ?, status = ?
      WHERE id = ?
    `).run(newName, newDesc, newStatus, catId);

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: updates.status !== undefined ? `Updated Category Status to ${newStatus}` : 'Updated Category Details',
      target: newName,
      previousValue: prev.status || 'Active',
      newValue: newStatus,
    });

    return this.getCategories().find((c) => c.id === catId);
  }

  // Admin General Settings
  getSettings() {
    return this.getEffectiveConfig().settings;
  }

  updateSettings(settings: Record<string, any>, actorUser: any) {
    const stmt = db.prepare(`
      INSERT INTO system_general_settings (setting_key, setting_value, setting_type, updated_by, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        setting_type = excluded.setting_type,
        updated_by = excluded.updated_by,
        updated_at = datetime('now')
    `);

    Object.entries(settings).forEach(([k, v]) => {
      const type = typeof v === 'boolean' ? 'boolean' : typeof v === 'number' ? 'number' : 'string';
      const valStr = String(v);
      stmt.run(k, valStr, type, actorUser.id);
    });

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: 'Updated System Settings',
      target: 'Platform Settings',
      previousValue: 'Previous Configuration',
      newValue: 'Updated General Settings',
    });
    return this.getSettings();
  }

  getGovernanceRouting() {
    const settings = this.getSettings();
    const allRoles = roleService.getRoles();
    const allUsers = this.getUsers();

    const getLevelDetails = (
      levelKey: 'employee' | 'manager' | 'director',
      defaultTarget: string,
      defaultStrategy: string,
      defaultUser: string
    ) => {
      const targetRoleId = settings[`governance.routing.${levelKey}`] || defaultTarget;
      const strategy = (settings[`governance.strategy.${levelKey}`] || defaultStrategy) as 'SPECIFIC_USER' | 'ROLE_QUEUE' | 'DIRECT_PUBLISH';
      const specificUserId = settings[`governance.user.${levelKey}`] || defaultUser;

      if (targetRoleId === 'DIRECT_PUBLISH' || strategy === 'DIRECT_PUBLISH') {
        return {
          id: 'DIRECT_PUBLISH',
          key: 'DIRECT_PUBLISH',
          name: 'Direct Publish',
          isDirectPublish: true,
          strategy: 'DIRECT_PUBLISH',
          specificUserId: null,
          specificUserName: 'N/A',
          isEligible: true,
          isRouteValid: true,
          eligibleUserCount: 0,
          eligibleUsers: [],
          statusMessage: 'Direct Publish (No Approval Required)',
        };
      }

      const targetLower = (targetRoleId || '').trim().toLowerCase();
      const role = allRoles.find(
        (r: any) =>
          r.id === targetRoleId ||
          r.key === targetRoleId ||
          r.id.toLowerCase() === targetLower ||
          r.key.toLowerCase() === targetLower ||
          r.name.toLowerCase() === targetLower
      );
      if (!role) {
        return {
          id: targetRoleId,
          key: targetRoleId,
          name: targetRoleId,
          isDirectPublish: false,
          strategy,
          specificUserId,
          specificUserName: 'Unknown',
          isEligible: false,
          isRouteValid: false,
          eligibleUserCount: 0,
          eligibleUsers: [],
          statusMessage: '⚠ Configured target role not found',
        };
      }

      const isOperational = role.key !== 'admin';
      const hasView = role.permissions.includes('template_approvals.view');
      const hasApprove = role.permissions.includes('template_approvals.approve');
      const isEligible = role.isActive && isOperational && hasView && hasApprove;

      const eligibleUsersInRole = allUsers
        .filter((u: any) => {
          if (u.status !== 'Active' || u.role === 'Admin') return false;
          const matchesRole =
            u.roleId === role.id ||
            u.roleKey === role.key ||
            (u.role && u.role.toLowerCase() === role.name.toLowerCase());
          if (!matchesRole) return false;
          const authUser = authorizationService.resolveUser(u.id);
          return !!(
            authUser &&
            authorizationService.hasPermission(authUser, 'template_approvals.view') &&
            authorizationService.hasPermission(authUser, 'template_approvals.approve')
          );
        })
        .map((u: any) => ({ id: u.id, name: u.name, email: u.email, department: u.department, role: u.role }));

      const activeUsersCount = eligibleUsersInRole.length;
      let statusMessage = '';
      let isRouteValid = true;

      const specificUser = eligibleUsersInRole.find((u) => u.id === specificUserId);
      const specificUserName = specificUser ? specificUser.name : (allUsers.find((u) => u.id === specificUserId)?.name || 'Unassigned');

      if (!isEligible) {
        isRouteValid = false;
        statusMessage = '⚠ Target role lacks required approval permissions';
      } else if (strategy === 'SPECIFIC_USER') {
        if (specificUser) {
          statusMessage = `✓ Valid Configuration (Reviewer: ${specificUser.name})`;
        } else {
          isRouteValid = false;
          statusMessage = `⚠ Configured reviewer is no longer eligible or active`;
        }
      } else if (strategy === 'ROLE_QUEUE') {
        if (activeUsersCount > 0) {
          statusMessage = `✓ Role Queue Active (${activeUsersCount} Eligible Reviewer${activeUsersCount === 1 ? '' : 's'})`;
        } else {
          isRouteValid = false;
          statusMessage = `⚠ 0 Active Users available in Target Role Queue`;
        }
      }

      return {
        id: role.id,
        key: role.key,
        name: role.name,
        roleType: role.roleType,
        governanceLevel: role.governanceLevel,
        isDirectPublish: false,
        strategy,
        specificUserId,
        specificUserName,
        isEligible,
        isRouteValid,
        eligibleUserCount: activeUsersCount,
        eligibleUsers: eligibleUsersInRole,
        statusMessage,
      };
    };

    const employeeTarget = getLevelDetails('employee', 'role-manager', 'SPECIFIC_USER', 'user-manager');
    const managerTarget = getLevelDetails('manager', 'role-director', 'SPECIFIC_USER', 'user-director');
    const directorTarget = getLevelDetails('director', 'DIRECT_PUBLISH', 'DIRECT_PUBLISH', 'DIRECT_PUBLISH');

    const allEligibleRoles = allRoles
      .filter((r: any) => r.isActive && r.key !== 'admin')
      .map((r: any) => {
        const hasView = r.permissions.includes('template_approvals.view');
        const hasApprove = r.permissions.includes('template_approvals.approve');
        const hasReviewPermissions = Boolean(hasView && hasApprove);

        const eligibleUsersInRole = allUsers
          .filter((u: any) => {
            if (u.status !== 'Active' || u.role === 'Admin') return false;
            const matchesRole =
              u.roleId === r.id ||
              u.roleKey === r.key ||
              (u.role && u.role.toLowerCase() === r.name.toLowerCase());
            if (!matchesRole) return false;
            const authUser = authorizationService.resolveUser(u.id);
            return !!(
              authUser &&
              authorizationService.hasPermission(authUser, 'template_approvals.view') &&
              authorizationService.hasPermission(authUser, 'template_approvals.approve')
            );
          })
          .map((u: any) => ({ id: u.id, name: u.name, email: u.email, department: u.department, role: u.role, roleId: u.roleId }));

        return {
          id: r.id,
          key: r.key,
          name: r.name,
          roleType: r.roleType,
          governanceLevel: r.governanceLevel,
          hasReviewPermissions,
          activeUserCount: r.activeAssignedUsers || 0,
          eligibleUserCount: eligibleUsersInRole.length,
          eligibleUsers: eligibleUsersInRole,
        };
      });

    return {
      routes: {
        employee: employeeTarget,
        manager: managerTarget,
        director: directorTarget,
      },
      eligibleRoles: allEligibleRoles,
    };
  }

  updateGovernanceRouting(
    routes: {
      employeeTargetRoleId?: string;
      employeeStrategy?: 'SPECIFIC_USER' | 'ROLE_QUEUE' | 'DIRECT_PUBLISH';
      employeeSpecificUserId?: string;
      managerTargetRoleId?: string;
      managerStrategy?: 'SPECIFIC_USER' | 'ROLE_QUEUE' | 'DIRECT_PUBLISH';
      managerSpecificUserId?: string;
      directorTargetRoleId?: string;
      directorStrategy?: 'SPECIFIC_USER' | 'ROLE_QUEUE' | 'DIRECT_PUBLISH';
      directorSpecificUserId?: string;
    },
    actorUser: any
  ) {
    const admin = authorizationService.requireAdmin(actorUser);
    const current = this.getGovernanceRouting().routes;

    const validateAndResolveRoute = (
      levelLabel: string,
      targetRoleId?: string,
      strategy?: string,
      specificUserId?: string
    ) => {
      const strat = strategy || 'SPECIFIC_USER';
      const roleId = targetRoleId || '';
      if (strat === 'DIRECT_PUBLISH' || roleId === 'DIRECT_PUBLISH') {
        return { targetRoleId: null, strategy: 'DIRECT_PUBLISH' as const, specificUserId: null };
      }

      const roleLower = (roleId || '').trim().toLowerCase();
      const role = roleService.getRoles().find(
        (r: any) =>
          r.id === roleId ||
          r.key === roleId ||
          r.id.toLowerCase() === roleLower ||
          r.key.toLowerCase() === roleLower ||
          r.name.toLowerCase() === roleLower
      );
      if (!role) throw new AppError(`Invalid target role for ${levelLabel}. Role not found.`, 400, 'INVALID_ROLE');
      if (!role.isActive) throw new AppError(`Cannot select inactive role "${role.name}" for ${levelLabel}.`, 400, 'INACTIVE_ROLE');
      if (role.key === 'admin') throw new AppError(`Admin role cannot be selected as a Template Governance approval target.`, 400, 'ADMIN_NOT_ALLOWED');
      if (!role.permissions.includes('template_approvals.view') || !role.permissions.includes('template_approvals.approve')) {
        throw new AppError(`Role "${role.name}" lacks required template approval permissions for ${levelLabel}.`, 400, 'INSUFFICIENT_ROLE_PERMISSIONS');
      }

      if (strat !== 'SPECIFIC_USER' && strat !== 'ROLE_QUEUE') {
        throw new AppError(`Invalid assignment strategy for ${levelLabel}. Must be SPECIFIC_USER, ROLE_QUEUE, or DIRECT_PUBLISH.`, 400, 'INVALID_STRATEGY');
      }

      let specUser = specificUserId;
      const isExplicit = specificUserId !== undefined;
      if (strat === 'SPECIFIC_USER') {
        const eligibleUsers = this.getUsers().filter((u: any) => {
          if (u.status !== 'Active' || u.role === 'Admin') return false;
          const matchesRole =
            u.roleId === role.id ||
            u.roleKey === role.key ||
            (u.role && u.role.toLowerCase() === role.name.toLowerCase());
          if (!matchesRole) return false;
          const authUser = authorizationService.resolveUser(u.id);
          return !!(authUser && authorizationService.hasPermission(authUser, 'template_approvals.view') && authorizationService.hasPermission(authUser, 'template_approvals.approve'));
        });
        if (eligibleUsers.length === 0) {
          throw new AppError(`No active eligible reviewers available in "${role.name}" for Specific User assignment.`, 400, 'NO_ELIGIBLE_REVIEWERS');
        }
        if (isExplicit && specUser) {
          if (!eligibleUsers.some((u) => u.id === specUser)) {
            throw new AppError('Selected reviewer does not belong to the configured Target Approval Role.', 400, 'INVALID_SPECIFIC_REVIEWER');
          }
        } else {
          if (!specUser || !eligibleUsers.some((u) => u.id === specUser)) {
            specUser = eligibleUsers[0].id;
          }
        }
      } else if (strat === 'ROLE_QUEUE') {
        const eligibleUsers = this.getUsers().filter((u: any) => {
          if (u.status !== 'Active' || u.role === 'Admin') return false;
          const matchesRole =
            u.roleId === role.id ||
            u.roleKey === role.key ||
            (u.role && u.role.toLowerCase() === role.name.toLowerCase());
          if (!matchesRole) return false;
          const authUser = authorizationService.resolveUser(u.id);
          return !!(authUser && authorizationService.hasPermission(authUser, 'template_approvals.view') && authorizationService.hasPermission(authUser, 'template_approvals.approve'));
        });
        if (eligibleUsers.length === 0) {
          throw new AppError(`No active eligible reviewers available in "${role.name}" for Role Queue assignment.`, 400, 'NO_ELIGIBLE_REVIEWERS');
        }
        specUser = '';
      }

      return { targetRoleId: role.id, strategy: strat, specificUserId: specUser || '' };
    };

    const empRes = validateAndResolveRoute(
      'Employee Level',
      routes.employeeTargetRoleId ?? current.employee.id,
      routes.employeeStrategy ?? current.employee.strategy,
      routes.employeeSpecificUserId
    );
    const mgrRes = validateAndResolveRoute(
      'Manager Level',
      routes.managerTargetRoleId ?? current.manager.id,
      routes.managerStrategy ?? current.manager.strategy,
      routes.managerSpecificUserId
    );
    const dirRes = validateAndResolveRoute(
      'Director Level',
      routes.directorTargetRoleId ?? current.director.id,
      routes.directorStrategy ?? current.director.strategy,
      routes.directorSpecificUserId
    );

    const resolvedRoutes = { employee: empRes, manager: mgrRes, director: dirRes };
    const settingsToPersist: Record<string, string> = {};
    Object.entries(resolvedRoutes).forEach(([level, route]) => {
      settingsToPersist[`governance.strategy.${level}`] = route.strategy;
      if (route.strategy === 'DIRECT_PUBLISH') {
        db.prepare(`DELETE FROM system_general_settings WHERE setting_key IN (?, ?)`)
          .run(`governance.routing.${level}`, `governance.user.${level}`);
      } else {
        settingsToPersist[`governance.routing.${level}`] = route.targetRoleId!;
        if (route.specificUserId) settingsToPersist[`governance.user.${level}`] = route.specificUserId;
        else db.prepare(`DELETE FROM system_general_settings WHERE setting_key = ?`).run(`governance.user.${level}`);
      }
    });
    this.updateSettings(settingsToPersist, admin);

    this.logAudit({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      action: 'TEMPLATE_GOVERNANCE_ROUTING_CHANGED',
      target: 'Template Governance Routing',
      previousValue: `Employee: ${current.employee.id} (${current.employee.strategy}) | Manager: ${current.manager.id} (${current.manager.strategy}) | Director: ${current.director.id} (${current.director.strategy})`,
      newValue: `Employee: ${empRes.targetRoleId} (${empRes.strategy}) | Manager: ${mgrRes.targetRoleId} (${mgrRes.strategy}) | Director: ${dirRes.targetRoleId} (${dirRes.strategy})`,
    });

    return this.getGovernanceRouting();
  }

  // Admin Audit Log
  logAudit(entry: {
    actorId: string;
    actorName: string;
    actorRole: string;
    action: string;
    target: string;
    previousValue?: string;
    newValue?: string;
  }) {
    const id = `adm-aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO admin_audit_log (id, actor_id, actor_name, actor_role, action, target, previous_value, new_value, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, entry.actorId, entry.actorName, entry.actorRole, entry.action, entry.target, entry.previousValue || '', entry.newValue || '', now);
  }

  getAuditLog(): AdminAuditEntry[] {
    const rows = db.prepare(`SELECT * FROM admin_audit_log ORDER BY timestamp DESC LIMIT 200`).all() as any[];
    return rows.map((r) => ({
      id: r.id,
      actor_id: r.actor_id,
      actor_name: r.actor_name,
      actor_role: r.actor_role,
      action: r.action,
      target: r.target,
      previous_value: r.previous_value,
      new_value: r.new_value,
      timestamp: r.timestamp,
    }));
  }

  // Admin Pack Management
  getPacks(filter?: { status?: string }) {
    let sql = `
      SELECT p.id, p.name, p.description, p.category_id as categoryId, c.name as categoryName,
             p.status, p.structure_json as structureJson, p.created_by as createdBy, u.name as createdByName,
             p.created_at as createdAt, p.updated_at as updatedAt
      FROM template_packs p
      LEFT JOIN report_template_categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filter?.status) {
      sql += ` AND p.status = ?`;
      params.push(filter.status);
    }
    sql += ` ORDER BY p.updated_at DESC`;
    const packs = db.prepare(sql).all(...params) as any[];

    return packs.map((p) => {
      const items = db.prepare(`
        SELECT id, pack_id as packId, source_type as sourceType, source_key as sourceKey,
               label, configuration_json as configurationJson, display_order as displayOrder, created_at as createdAt
        FROM template_pack_items
        WHERE pack_id = ?
        ORDER BY display_order ASC
      `).all(p.id) as any[];

      let structure: any[] | undefined;
      try {
        structure = p.structureJson ? JSON.parse(p.structureJson) : undefined;
      } catch {
        structure = undefined;
      }
      return {
        ...p,
        structure,
        items: items.map((i) => ({
          ...i,
          configuration: i.configurationJson ? JSON.parse(i.configurationJson) : {},
        })),
      };
    });
  }

  getPackById(id: string) {
    const packs = this.getPacks();
    return packs.find((p) => p.id === id) || null;
  }

  createPack(data: { name: string; description?: string; categoryId?: string; status?: 'Draft' | 'Published' | 'Disabled'; items?: any[]; structure?: any[] }, actorUser: any) {
    this.requireAdmin(actorUser);
    if (!data.name || !data.name.trim()) throw new Error('Pack name is required.');
    if (data.status !== undefined && !['Draft', 'Published', 'Disabled'].includes(data.status)) {
      throw new Error('Invalid Pack status.');
    }

    const cleanName = data.name.trim();
    const existing = db.prepare("SELECT id FROM template_packs WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))").get(cleanName);
    if (existing) throw new Error('A Pack with this name already exists.');

    const structureComponents = Array.isArray(data.structure)
      ? data.structure.flatMap((section: any) => Array.isArray(section?.components) ? section.components : [])
      : [];
    const items = Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : structureComponents.map((component: any) => ({
        sourceType: 'element',
        sourceKey: `elements.${component.type || 'text'}`,
        label: component.label || component.type || 'Component',
        configuration: { component },
      }));
    if (items.length === 0) {
      throw new Error('Add at least one component to the Pack canvas.');
    }

    const packId = `pack-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const status = data.status || 'Published';
    const description = (data.description && data.description.trim()) || 'Reusable building block pack.';

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO template_packs (id, name, description, category_id, status, created_by, structure_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(packId, cleanName, description, data.categoryId || null, status, actorUser.id, data.structure ? JSON.stringify(data.structure) : null);

      const insertItem = db.prepare(`
        INSERT INTO template_pack_items (id, pack_id, source_type, source_key, label, configuration_json, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      items.forEach((item, idx) => {
        insertItem.run(
          `item-${packId}-${idx}-${Date.now()}`,
          packId,
          item.sourceType || item.type || 'field',
          item.sourceKey || item.key || null,
          item.label || 'Item',
          JSON.stringify(item.configuration || item.config || {}),
          idx
        );
      });
    });
    transaction();

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: 'Created and Published Pack',
      target: cleanName,
      newValue: status,
    });

    return this.getPackById(packId);
  }

  updatePack(id: string, data: { name?: string; description?: string; categoryId?: string; status?: 'Draft' | 'Published' | 'Disabled'; items?: any[]; structure?: any[] }, actorUser: any) {
    this.requireAdmin(actorUser);
    if (data.status !== undefined && !['Draft', 'Published', 'Disabled'].includes(data.status)) {
      throw new Error('Invalid Pack status.');
    }
    const prev = this.getPackById(id);
    if (!prev) throw new Error(`Pack "${id}" not found.`);

    let newName = prev.name;
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error('Pack name is required.');
      newName = data.name.trim();
      const existing = db.prepare("SELECT id FROM template_packs WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND id != ?").get(newName, id);
      if (existing) throw new Error('A Pack with this name already exists.');
    }

    const structureComponents = Array.isArray(data.structure)
      ? data.structure.flatMap((section: any) => Array.isArray(section?.components) ? section.components : [])
      : [];
    const replacementItems = Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : data.structure !== undefined
        ? structureComponents.map((component: any) => ({
          sourceType: 'element',
          sourceKey: `elements.${component.type || 'text'}`,
          label: component.label || component.type || 'Component',
          configuration: { component },
        }))
        : undefined;
    if (replacementItems && replacementItems.length === 0) {
      throw new Error('Add at least one component to the Pack canvas.');
    }

    const newDesc = data.description !== undefined ? data.description.trim() : prev.description;
    const newCatId = data.categoryId !== undefined ? data.categoryId : prev.categoryId;
    const newStatus = data.status !== undefined ? data.status : prev.status;

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE template_packs
        SET name = ?, description = ?, category_id = ?, status = ?,
            structure_json = COALESCE(?, structure_json), updated_at = datetime('now')
        WHERE id = ?
      `).run(newName, newDesc, newCatId || null, newStatus, data.structure !== undefined ? JSON.stringify(data.structure) : null, id);

      if (replacementItems) {
        db.prepare(`DELETE FROM template_pack_items WHERE pack_id = ?`).run(id);
        const insertItem = db.prepare(`
          INSERT INTO template_pack_items (id, pack_id, source_type, source_key, label, configuration_json, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        replacementItems.forEach((item, idx) => {
          insertItem.run(
            `item-${id}-${idx}-${Date.now()}`,
            id,
            item.sourceType || item.type || 'field',
            item.sourceKey || item.key || null,
            item.label || 'Item',
            JSON.stringify(item.configuration || item.config || {}),
            idx
          );
        });
      }
    });
    transaction();

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: 'Updated Pack',
      target: newName,
      previousValue: prev.status,
      newValue: newStatus,
    });

    return this.getPackById(id);
  }

  publishPack(id: string, actorUser: any) {
    return this.updatePackStatus(id, 'Published', actorUser);
  }

  updatePackStatus(id: string, status: 'Draft' | 'Published' | 'Disabled', actorUser: any) {
    this.requireAdmin(actorUser);
    const prev = this.getPackById(id);
    if (!prev) throw new Error(`Pack "${id}" not found.`);

    db.prepare(`UPDATE template_packs SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: status === 'Published' ? 'Published Pack' : status === 'Disabled' ? 'Disabled Pack' : 'Saved Pack as Draft',
      target: prev.name,
      previousValue: prev.status,
      newValue: status,
    });

    return this.getPackById(id);
  }

  // Admin Content Library Management
  getContentLibraryItems(filter?: { enabledOnly?: boolean; category?: string }) {
    let sql = `
      SELECT c.id, c.name, c.description, c.category, c.content_type as contentType,
             c.content_value as contentValue, c.enabled, c.created_by as createdBy, u.name as createdByName,
             c.created_at as createdAt, c.updated_at as updatedAt
      FROM content_library_items c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.enabledOnly) {
      sql += ` AND c.enabled = 1`;
    }
    if (filter?.category && filter.category !== 'All') {
      sql += ` AND c.category = ?`;
      params.push(filter.category);
    }
    sql += ` ORDER BY c.updated_at DESC`;

    const rows = db.prepare(sql).all(...params) as any[];
    return rows.map((r) => ({
      ...r,
      enabled: Boolean(r.enabled),
    }));
  }

  createContentItem(data: { name: string; description?: string; category: string; contentType: string; contentValue: string }, actorUser: any) {
    if (!data.name || !data.name.trim()) throw new Error('Content name is required.');
    if (!data.contentValue || !data.contentValue.trim()) throw new Error('Content value is required.');
    if (!data.category) throw new Error('Content category is required.');
    if (!data.contentType) throw new Error('Content type is required.');

    const itemId = `cli-${Date.now()}`;
    db.prepare(`
      INSERT INTO content_library_items (id, name, description, category, content_type, content_value, enabled, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(itemId, data.name.trim(), (data.description || '').trim(), data.category, data.contentType, data.contentValue.trim(), actorUser.id);

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: 'Added Content Library Item',
      target: data.name.trim(),
      newValue: 'Enabled',
    });

    return this.getContentLibraryItems().find((i) => i.id === itemId);
  }

  updateContentItem(id: string, data: { name?: string; description?: string; category?: string; contentType?: string; contentValue?: string; enabled?: boolean }, actorUser: any) {
    const prev = this.getContentLibraryItems().find((i) => i.id === id);
    if (!prev) throw new Error(`Content Library Item "${id}" not found.`);

    const newName = data.name !== undefined ? data.name.trim() : prev.name;
    const newDesc = data.description !== undefined ? data.description.trim() : prev.description;
    const newCat = data.category !== undefined ? data.category : prev.category;
    const newType = data.contentType !== undefined ? data.contentType : prev.contentType;
    const newVal = data.contentValue !== undefined ? data.contentValue.trim() : prev.contentValue;
    const newEnabled = data.enabled !== undefined ? (data.enabled ? 1 : 0) : (prev.enabled ? 1 : 0);

    db.prepare(`
      UPDATE content_library_items
      SET name = ?, description = ?, category = ?, content_type = ?, content_value = ?, enabled = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newName, newDesc, newCat, newType, newVal, newEnabled, id);

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: 'Updated Content Library Item',
      target: newName,
      previousValue: prev.enabled ? 'Enabled' : 'Disabled',
      newValue: newEnabled ? 'Enabled' : 'Disabled',
    });

    return this.getContentLibraryItems().find((i) => i.id === id);
  }

  updateContentItemStatus(id: string, enabled: boolean, actorUser: any) {
    const prev = this.getContentLibraryItems().find((i) => i.id === id);
    if (!prev) throw new Error(`Content Library Item "${id}" not found.`);

    db.prepare(`UPDATE content_library_items SET enabled = ?, updated_at = datetime('now') WHERE id = ?`).run(enabled ? 1 : 0, id);

    this.logAudit({
      actorId: actorUser.id,
      actorName: actorUser.name,
      actorRole: actorUser.role,
      action: enabled ? 'Enabled Content Library Item' : 'Disabled Content Library Item',
      target: prev.name,
      previousValue: prev.enabled ? 'Enabled' : 'Disabled',
      newValue: enabled ? 'Enabled' : 'Disabled',
    });

    return this.getContentLibraryItems().find((i) => i.id === id);
  }
}

export const adminService = new AdminService();

