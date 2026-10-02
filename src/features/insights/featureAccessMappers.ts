import type {
  FeatureAccessPage,
  FeatureAccessPagination,
  FeatureRoleAccessRow,
  FeatureUserAccessRow,
  FeatureUserOverride,
} from './featureAccessTypes';
import type { FeatureAccessState } from './featureAccessTypes';

type Row = Record<string, unknown>;

const value = (row: Row, camel: string, snake: string) => row[camel] ?? row[snake];
const text = (input: unknown, fallback = '') => typeof input === 'string' ? input : fallback;
const bool = (input: unknown) => input === true;
const count = (input: unknown) => Number.isFinite(Number(input)) ? Number(input) : 0;

export function mapCurrentFeatureAccess(input: unknown, fallbackFeatureKey: string): FeatureAccessState {
  const row = input as Row | null;
  if (!row || typeof row !== 'object') throw new Error('The feature access check returned no data.');
  return {
    featureKey: text(value(row, 'featureKey', 'feature_key'), fallbackFeatureKey),
    enabled: bool(row.enabled),
    allowed: bool(row.allowed),
    protectedAdmin: bool(value(row, 'protectedAdmin', 'protected_admin')),
  };
}

export function mapFeatureAccessPagination(row: Row): FeatureAccessPagination {
  const limit = count(row.limit);
  const offset = count(row.offset);
  return { limit, offset, total: count(row.total) };
}

export function mapFeatureRoleAccessRow(input: Row): FeatureRoleAccessRow {
  return {
    roleId: text(value(input, 'roleId', 'role_id')),
    roleKey: text(value(input, 'roleKey', 'role_key')),
    roleName: text(value(input, 'roleName', 'role_name')),
    roleType: text(value(input, 'roleType', 'role_type')),
    governanceLevel: (value(input, 'governanceLevel', 'governance_level') as string | null | undefined) ?? null,
    isActive: bool(value(input, 'isActive', 'is_active')),
    isProtected: bool(value(input, 'isProtected', 'is_protected')),
    memberCount: count(value(input, 'memberCount', 'member_count')),
    allowed: bool(input.allowed),
    effectiveAllowed: bool(value(input, 'effectiveAllowed', 'effective_allowed')),
    configurable: bool(input.configurable),
  };
}

const overrides = new Set<FeatureUserOverride>(['inherit', 'allow', 'deny']);

export function mapFeatureUserAccessRow(input: Row): FeatureUserAccessRow {
  const candidate = text(input.override) as FeatureUserOverride;
  return {
    userId: text(value(input, 'userId', 'user_id')),
    profileCode: (value(input, 'profileCode', 'profile_code') as string | null | undefined) ?? null,
    fullName: text(value(input, 'fullName', 'full_name'), 'Unknown user'),
    email: (input.email as string | null | undefined) ?? null,
    status: text(input.status),
    roleId: (value(input, 'roleId', 'role_id') as string | null | undefined) ?? null,
    roleKey: (value(input, 'roleKey', 'role_key') as string | null | undefined) ?? null,
    roleName: (value(input, 'roleName', 'role_name') as string | null | undefined) ?? null,
    roleActive: bool(value(input, 'roleActive', 'role_active')),
    roleAllowed: bool(value(input, 'roleAllowed', 'role_allowed')),
    override: overrides.has(candidate) ? candidate : 'inherit',
    effectiveAllowed: bool(value(input, 'effectiveAllowed', 'effective_allowed')),
    protectedAdmin: bool(value(input, 'protectedAdmin', 'protected_admin')),
    configurable: bool(input.configurable),
  };
}

export function mapFeatureAccessPage<T>(
  input: unknown,
  mapItem: (row: Row) => T,
): FeatureAccessPage<T> {
  const root = (Array.isArray(input) ? input[0] : input) as Row | null;
  if (!root || typeof root !== 'object') throw new Error('The access directory returned no data.');
  const items = Array.isArray(root.items) ? root.items as Row[] : [];
  const pagination = (root.pagination && typeof root.pagination === 'object' ? root.pagination : {}) as Row;
  return {
    featureKey: text(value(root, 'featureKey', 'feature_key')),
    featureEnabled: bool(value(root, 'featureEnabled', 'feature_enabled')),
    items: items.map(mapItem),
    pagination: mapFeatureAccessPagination(pagination),
  };
}
