export const PERMISSION_GROUPS = [
  {
    id: 'templates',
    label: 'Templates',
    permissions: [
      ['templates.view_approved', 'View Approved Templates'],
      ['templates.create', 'Create Templates'],
      ['templates.edit_own_draft', 'Edit Own Draft Templates'],
      ['templates.submit', 'Submit Templates'],
      ['templates.preview', 'Preview Templates'],
      ['templates.use', 'Use Templates'],
      ['templates.archive_any', 'Delete Templates'],
    ],
  },
  {
    id: 'studio',
    label: 'Template Studio',
    permissions: [
      ['studio.access', 'Use Template Studio'],
      ['studio.elements.use', 'Use Elements'],
      ['studio.data_fields.use', 'Use Data Fields'],
      ['studio.content.use', 'Use Content Library'],
      ['studio.standard_packs.use', 'Use Standard Packs'],
      ['studio.my_packs.create', 'Create My Packs'],
      ['studio.themes.use', 'Use Themes'],
      ['studio.sections.use', 'Use Sections'],
      ['studio.text.use', 'Use Text Tools'],
      ['studio.workflow.use', 'Use Workflow Designer'],
    ],
  },
  {
    id: 'template-governance',
    label: 'Template Governance',
    permissions: [
      ['template_approvals.view', 'View Template Approval Queue'],
      ['template_approvals.approve', 'Approve Templates'],
      ['template_approvals.reject', 'Reject Templates'],
      ['template_approvals.comment', 'Comment on Template Requests'],
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    permissions: [
      ['reports.view_own', 'View Own Reports'],
      ['reports.view_received', 'View Received Reports'],
      ['reports.view_signed', 'View Signed Reports'],
      ['reports.view_organization', 'View Organization Reports'],
      ['reports.create', 'Create Reports'],
      ['reports.edit_draft', 'Edit Draft Reports'],
      ['reports.complete', 'Complete Reports'],
      ['reports.send', 'Send Reports'],
      ['reports.comment', 'Comment on Reports'],
      ['reports.return', 'Return Reports for Changes'],
      ['reports.reject', 'Reject Reports'],
      ['reports.sign', 'Sign Reports'],
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    permissions: [
      ['notifications.view', 'View Notifications'],
      ['notifications.read_state.manage', 'Manage Notification Read State'],
    ],
  },
  {
    id: 'other',
    label: 'Other Operational Capabilities',
    permissions: [
      ['search.use', 'Use Global Search'],
      ['audit_history.view', 'View Audit History'],
      ['signature_profile.use', 'Use Personal Signature Profile'],
    ],
  },
] as const;

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]['permissions'][number][0];
export type GovernanceLevel = 'Employee' | 'Manager' | 'Director' | 'None';
export type RoleType = 'System' | 'Custom';

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) => group.permissions.map(([key]) => key)) as PermissionKey[];
export const PERMISSION_KEY_SET = new Set<string>(ALL_PERMISSION_KEYS);

const COMMON_OPERATIONAL_PERMISSIONS: PermissionKey[] = [
  'templates.view_approved', 'templates.create', 'templates.edit_own_draft', 'templates.submit', 'templates.preview', 'templates.use',
  'studio.access', 'studio.elements.use', 'studio.data_fields.use', 'studio.content.use', 'studio.standard_packs.use',
  'studio.my_packs.create', 'studio.themes.use', 'studio.sections.use', 'studio.text.use', 'studio.workflow.use',
  'template_approvals.comment',
  'reports.view_own', 'reports.view_received', 'reports.view_signed', 'reports.create', 'reports.edit_draft', 'reports.complete',
  'reports.send', 'reports.comment', 'reports.return', 'reports.reject', 'reports.sign',
  'notifications.view', 'notifications.read_state.manage', 'search.use', 'audit_history.view', 'signature_profile.use',
];

export const SYSTEM_ROLE_DEFINITIONS = [
  {
    id: 'role-employee', key: 'employee', name: 'Employee', description: 'Standard operational report author.',
    governanceLevel: 'Employee' as GovernanceLevel, permissions: COMMON_OPERATIONAL_PERMISSIONS,
  },
  {
    id: 'role-manager', key: 'manager', name: 'Manager', description: 'Operational manager and assigned template approver.',
    governanceLevel: 'Manager' as GovernanceLevel,
    permissions: [...COMMON_OPERATIONAL_PERMISSIONS, 'template_approvals.view', 'template_approvals.approve', 'template_approvals.reject'] as PermissionKey[],
  },
  {
    id: 'role-director', key: 'director', name: 'Director', description: 'Executive reviewer with organization report visibility.',
    governanceLevel: 'Director' as GovernanceLevel,
    permissions: [...COMMON_OPERATIONAL_PERMISSIONS, 'template_approvals.view', 'template_approvals.approve', 'template_approvals.reject', 'reports.view_organization'] as PermissionKey[],
  },
  {
    id: 'role-admin', key: 'admin', name: 'Admin', description: 'Protected WidgetFlow platform administrator.',
    governanceLevel: 'None' as GovernanceLevel, permissions: [] as PermissionKey[],
  },
] as const;

export function hasPermissionKeys(permissionKeys: readonly string[] | undefined, permission: PermissionKey): boolean {
  return Boolean(permissionKeys?.includes(permission));
}

export function permissionLabel(permissionKey: string): string {
  for (const group of PERMISSION_GROUPS) {
    const permission = group.permissions.find(([key]) => key === permissionKey);
    if (permission) return permission[1];
  }
  return permissionKey;
}

export function getDefaultSystemRolePermissions(roleKey: string): PermissionKey[] {
  const normKey = roleKey.trim().toLowerCase();
  const def = SYSTEM_ROLE_DEFINITIONS.find((r) => r.key === normKey);
  return def ? [...def.permissions] : [];
}
