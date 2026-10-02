export interface EffectiveAuthorityPermissionContext {
  mode: 'own' | 'delegated';
  actorPermissions?: readonly string[] | null;
  effectivePermissions?: readonly string[] | null;
}

/**
 * Operational permission checks must use exactly one authority source. In
 * delegated mode, the actor's permanent permission set is never unioned in.
 */
export function hasEffectiveAuthorityPermission(
  context: EffectiveAuthorityPermissionContext | null | undefined,
  permission: string,
): boolean {
  if (!context) return false;
  const permissions = context.mode === 'delegated'
    ? context.effectivePermissions
    : context.actorPermissions;
  return Array.isArray(permissions) && permissions.includes(permission);
}

type TemplateReportPermission =
  | 'reports.create'
  | 'reports.view_own'
  | 'templates.view_approved'
  | 'templates.use';

/** The approved-template report RPC requires this complete permission set in every authority context. */
export function canCreateTemplateBackedReport(
  hasPermission: (permission: TemplateReportPermission) => boolean,
): boolean {
  return hasPermission('reports.create')
    && hasPermission('reports.view_own')
    && hasPermission('templates.view_approved')
    && hasPermission('templates.use')
}

type TemplateAuthoringPermission = 'templates.create' | 'templates.edit_own_draft';

/** Studio entry follows template authoring rights; studio feature permissions remain scoped to their individual panels. */
export function canAuthorTemplate(
  hasPermission: (permission: TemplateAuthoringPermission) => boolean,
  existingTemplateId?: string | null,
): boolean {
  return hasPermission(existingTemplateId ? 'templates.edit_own_draft' : 'templates.create');
}

/** A draft is editable when either supported authoring capability is present. */
export function canEditTemplateDraft(hasPermission: (permission: TemplateAuthoringPermission) => boolean): boolean {
  return hasPermission('templates.create') || hasPermission('templates.edit_own_draft');
}

interface DelegatedAuthoritySnapshot {
  mode: 'own' | 'delegated';
  staleSelection?: boolean;
  delegation?: { delegationId?: string | null; delegatedByUserId?: string | null } | null;
  actor?: { userId?: string | null } | null;
  operationalSubject?: { userId?: string | null } | null;
}

/** Use the final server-read authority snapshot to decide transition success. */
export function confirmsDelegatedAuthority(
  context: DelegatedAuthoritySnapshot | null | undefined,
  delegationId: string,
): boolean {
  return Boolean(
    context?.mode === 'delegated'
    && !context.staleSelection
    && context.delegation?.delegationId === delegationId
    && context.delegation.delegatedByUserId
    && context.delegation.delegatedByUserId === context.operationalSubject?.userId,
  );
}

export function confirmsOwnAuthority(context: DelegatedAuthoritySnapshot | null | undefined): boolean {
  return Boolean(
    context?.mode === 'own'
    && !context.delegation
    && context.actor?.userId
    && context.actor.userId === context.operationalSubject?.userId,
  );
}
