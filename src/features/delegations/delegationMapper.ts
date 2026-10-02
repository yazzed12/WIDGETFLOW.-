import type { AuthorityContext, DelegationCandidate, DelegationPage, DelegationRecord, DelegationStatus } from './delegationTypes';

const text = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const nullableText = (value: unknown): string | null => typeof value === 'string' && value.length ? value : null;
const obj = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const first = (source: Record<string, any>, ...keys: string[]) => keys.map((key) => source[key]).find((value) => value !== undefined && value !== null);
const rowsOf = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const source = obj(value);
  const rows = first(source, 'rows', 'items', 'results', 'data');
  return Array.isArray(rows) ? rows : [];
};

export function mapDelegationCandidate(value: unknown): DelegationCandidate {
  const row = obj(value);
  return {
    userId: text(first(row, 'user_id', 'userId', 'id')),
    fullName: text(first(row, 'full_name', 'fullName', 'name'), 'Unknown user'),
    profileCode: nullableText(first(row, 'profile_code', 'profileCode')),
    roleName: text(first(row, 'role_name', 'roleName', 'role')),
    email: nullableText(row.email),
  };
}

export function mapDelegationRecord(value: unknown): DelegationRecord {
  const row = obj(value);
  const status = text(row.status, 'expired').toLowerCase() as DelegationStatus;
  const authority = obj(row.authority);
  return {
    id: text(first(row, 'delegation_id', 'delegationId', 'id')),
    delegatorUserId: text(first(row, 'delegator_user_id', 'delegatorUserId')),
    delegatorName: text(first(row, 'delegator_name', 'delegatorName'), 'Unknown user'),
    delegatorRoleName: text(first(row, 'delegator_role_name', 'delegatorRoleName')),
    delegateUserId: text(first(row, 'delegate_user_id', 'delegateUserId')),
    delegateName: text(first(row, 'delegate_name', 'delegateName'), 'Unknown user'),
    delegateProfileCode: nullableText(first(row, 'delegate_profile_code', 'delegateProfileCode')),
    delegateRoleName: text(first(row, 'delegate_role_name', 'delegateRoleName')),
    authorityRoleId: text(first(row, 'authority_role_id', 'authorityRoleId') ?? authority.role_id),
    authorityRoleKey: text(first(row, 'authority_role_key', 'authorityRoleKey') ?? authority.role_key),
    authorityRoleName: text(first(row, 'authority_role_name', 'authorityRoleName') ?? authority.role_name, 'Authority'),
    startAt: text(first(row, 'start_at', 'startAt')),
    endAt: text(first(row, 'end_at', 'endAt')),
    status: ['scheduled', 'active', 'expired', 'cancelled'].includes(status) ? status : 'expired',
    reason: nullableText(row.reason),
    cancelledAt: nullableText(first(row, 'cancelled_at', 'cancelledAt')),
  };
}

export function mapPage<T>(value: unknown, mapper: (row: unknown) => T, limit: number, offset: number): DelegationPage<T> {
  const source = obj(value);
  const rows = rowsOf(value);
  const total = Number(first(source, 'total_count', 'totalCount', 'total') ?? rows.length);
  return { rows: rows.map(mapper), totalCount: Number.isFinite(total) ? total : rows.length, limit, offset };
}

export function mapAuthorityContext(value: unknown): AuthorityContext {
  const source = obj(value);
  if (source.mode !== 'own' && source.mode !== 'delegated') {
    throw new Error('Invalid authority context mode');
  }
  const actor = obj(source.actor);
  const delegationValue = source.delegation;
  const delegation = delegationValue ? obj(delegationValue) : null;
  const authority = obj(source.authority);
  const operationalSubject = obj(first(source, 'operationalSubject', 'operational_subject'));
  const mode = source.mode;
  // Compatibility shapes supported by this mapper, not proof of the deployed
  // RPC shape. Only server-returned keys are consumed; never use role defaults.
  const permissionCandidates = [
    first(authority, 'effectivePermissions', 'effective_permissions', 'effective_permission_keys', 'permissions'),
    first(source, 'effectivePermissions', 'effective_permissions', 'effective_permission_keys', 'permissions'),
  ];
  const permissions = permissionCandidates.find((candidate) => Array.isArray(candidate) && candidate.length > 0)
    ?? permissionCandidates.find(Array.isArray);
  const mapped: AuthorityContext = {
    mode,
    actor: {
      userId: text(first(actor, 'userId', 'user_id')).trim(),
      fullName: text(first(actor, 'fullName', 'full_name')).trim(),
      roleId: text(first(actor, 'roleId', 'role_id')).trim(),
      roleName: text(first(actor, 'roleName', 'role_name')).trim(),
    },
    delegation: delegation ? {
      delegationId: text(first(delegation, 'delegationId', 'delegation_id')),
      delegatedByUserId: text(first(delegation, 'delegatedByUserId', 'delegated_by_user_id')),
      delegatedByName: text(first(delegation, 'delegatedByName', 'delegated_by_name')),
      startAt: text(first(delegation, 'startAt', 'start_at')),
      endAt: text(first(delegation, 'endAt', 'end_at')),
    } : null,
    operationalSubject: {
      userId: text(first(operationalSubject, 'userId', 'user_id')).trim(),
      fullName: text(first(operationalSubject, 'fullName', 'full_name')).trim(),
      roleId: text(first(operationalSubject, 'roleId', 'role_id')).trim(),
      roleKey: text(first(operationalSubject, 'roleKey', 'role_key')).trim(),
      roleName: text(first(operationalSubject, 'roleName', 'role_name')).trim(),
      governanceLevel: nullableText(first(operationalSubject, 'governanceLevel', 'governance_level')),
    },
    authority: {
      roleId: text(first(authority, 'roleId', 'role_id')).trim(),
      roleKey: text(first(authority, 'roleKey', 'role_key')).trim(),
      roleName: text(first(authority, 'roleName', 'role_name')).trim(),
      governanceLevel: nullableText(first(authority, 'governanceLevel', 'governance_level')),
      ...(Array.isArray(permissions) ? { effectivePermissions: permissions.filter((key): key is string => typeof key === 'string') } : {}),
    },
    staleSelection: source.staleSelection === true || source.stale_selection === true,
  };

  const requiredIdentityValues = [
    mapped.actor.userId,
    mapped.actor.fullName,
    mapped.actor.roleId,
    mapped.actor.roleName,
    mapped.operationalSubject.userId,
    mapped.operationalSubject.fullName,
    mapped.operationalSubject.roleId,
    mapped.operationalSubject.roleKey,
    mapped.operationalSubject.roleName,
    mapped.authority.roleId,
    mapped.authority.roleKey,
    mapped.authority.roleName,
  ];
  if (requiredIdentityValues.some((field) => !field)) {
    throw new Error('Incomplete authority context');
  }
  if (mapped.staleSelection && mapped.mode !== 'own') {
    throw new Error('Stale authority context must not remain delegated');
  }
  if (mapped.mode === 'own') {
    if (mapped.delegation || mapped.operationalSubject.userId !== mapped.actor.userId) {
      throw new Error('Inconsistent own authority context');
    }
  } else if (
    !mapped.delegation ||
    !mapped.delegation.delegationId ||
    !mapped.delegation.delegatedByUserId ||
    !mapped.delegation.delegatedByName ||
    !Number.isFinite(Date.parse(mapped.delegation.startAt)) ||
    !Number.isFinite(Date.parse(mapped.delegation.endAt)) ||
    Date.parse(mapped.delegation.startAt) >= Date.parse(mapped.delegation.endAt) ||
    mapped.operationalSubject.userId !== mapped.delegation.delegatedByUserId
  ) {
    throw new Error('Inconsistent delegated authority context');
  }
  if (import.meta.env?.DEV && mapped.mode === 'delegated') {
    // Diagnose the server envelope without dumping an RPC response or actor
    // credentials. Missing, empty, and non-array fields remain distinguishable.
    const relevantKeys = ['reports.create', 'templates.create', 'templates.use', 'templates.view_approved', 'reports.view_own'];
    const permissionSources = [ ['authority', authority], ['root', source] ] as const;
    console.info('[WidgetFlow authority mapping]', {
      authorityRole: { id: mapped.authority.roleId, name: mapped.authority.roleName },
      sources: permissionSources.flatMap(([location, record]) =>
        ['effectivePermissions', 'effective_permissions', 'effective_permission_keys', 'permissions']
          .filter((key) => Object.hasOwn(record, key))
          .map((key) => ({
            path: `${location}.${key}`,
            shape: Array.isArray(record[key]) ? 'array' : record[key] === null ? 'null' : typeof record[key],
            count: Array.isArray(record[key]) ? record[key].length : null,
            relevantKeys: relevantKeys.filter((permission) => Array.isArray(record[key]) && record[key].includes(permission)),
          }))),
      mappedCount: mapped.authority.effectivePermissions?.length ?? null,
      mappedRelevantKeys: relevantKeys.filter((key) => mapped.authority.effectivePermissions?.includes(key)),
    });
  }
  return mapped;
}
