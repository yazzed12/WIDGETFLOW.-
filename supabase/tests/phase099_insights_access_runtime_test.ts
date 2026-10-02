import assert from 'node:assert/strict';
import { canAccessInsights } from '../../src/features/insights/templateInsightsAccess';
import { mapCurrentFeatureAccess, mapFeatureAccessPage, mapFeatureRoleAccessRow, mapFeatureUserAccessRow } from '../../src/features/insights/featureAccessMappers';

const makeResolution = (response: unknown) => {
  const access = mapCurrentFeatureAccess(response, 'insights');
  return { status: 'ready' as const, enabled: access.enabled, insightsAllowed: access.allowed, protectedAdmin: access.protectedAdmin };
};

assert.equal(canAccessInsights({ status: 'loading', enabled: false, insightsAllowed: false, protectedAdmin: false }), false);
assert.equal(canAccessInsights({ status: 'error', enabled: true, insightsAllowed: true, protectedAdmin: false }), false);
assert.equal(canAccessInsights(makeResolution({ featureKey: 'insights', enabled: true, allowed: true, protectedAdmin: false })), true);
assert.equal(canAccessInsights(makeResolution({ featureKey: 'insights', enabled: false, allowed: false, protectedAdmin: false })), false);
assert.equal(canAccessInsights(makeResolution({ featureKey: 'insights', enabled: false, allowed: true, protectedAdmin: true })), true, 'Protected Admin effective access remains canonical and independent of the global toggle');

const payload = { feature_key: 'insights', feature_enabled: true, items: [{
  role_id: 'role-uuid-1', role_key: 'custom-role', role_name: 'Custom Role', role_type: 'custom', governance_level: 'L4',
  is_active: true, is_protected: false, member_count: 4, allowed: false, effective_allowed: false, configurable: true,
}], pagination: { limit: 25, offset: 0, total: 31 } };
const roles = mapFeatureAccessPage(payload, mapFeatureRoleAccessRow);
assert.deepEqual(roles.pagination, { limit: 25, offset: 0, total: 31 });
assert.equal(roles.items[0].roleId, 'role-uuid-1');
assert.equal(roles.items[0].allowed, false);
assert.equal(roles.items[0].configurable, true);

const user = mapFeatureUserAccessRow({ user_id: 'profile-uuid-1', profile_code: 'EMP-001', full_name: 'Test User', email: 'test@example.invalid', status: 'Active', role_id: 'role-uuid-1', role_key: 'custom-role', role_name: 'Custom Role', role_active: true, role_allowed: false, override: 'allow', effective_allowed: true, protected_admin: false, configurable: true });
assert.equal(user.userId, 'profile-uuid-1');
assert.equal(user.profileCode, 'EMP-001');
assert.equal(user.roleAllowed, false);
assert.equal(user.override, 'allow');
assert.equal(user.effectiveAllowed, true, 'the backend effective result is retained rather than recomputed');
assert.equal(mapFeatureUserAccessRow({ user_id: 'protected-profile', full_name: 'Protected', status: 'Active', role_active: true, role_allowed: false, override: 'deny', effective_allowed: true, protected_admin: true, configurable: false }).protectedAdmin, true);
assert.equal(mapFeatureUserAccessRow({ user_id: 'u', override: 'unexpected' }).override, 'inherit', 'unknown override representation safely falls back to display-only inheritance');

console.log('Phase 099 Insights access runtime tests passed.');
