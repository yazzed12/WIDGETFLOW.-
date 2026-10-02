import assert from 'node:assert/strict';
import { canAccessInsights } from '../../src/features/insights/templateInsightsAccess';
import { mapCurrentFeatureAccess, mapFeatureAccessPage, mapFeatureRoleAccessRow, mapFeatureUserAccessRow } from '../../src/features/insights/featureAccessMappers';
import { createTemplateInsightsDateRange, isSupportedTemplateInsightsRange } from '../../src/features/insights/templateInsightsDateRange';
import { mapTemplateInsightDetail, mapTemplateInsightsResponse, mapTemplateUsagePeriodSummary } from '../../src/features/insights/templateInsightsMapper';
import { normalizeTemplateUsageTrend } from '../../src/features/insights/templateInsightsTrend';

assert.equal(canAccessInsights({ status: 'loading', enabled: true, insightsAllowed: true, protectedAdmin: false }), false, 'unresolved access fails closed');
assert.equal(canAccessInsights({ status: 'error', enabled: true, insightsAllowed: true, protectedAdmin: false }), false, 'failed access resolution fails closed');
assert.equal(canAccessInsights({ status: 'ready', enabled: true, insightsAllowed: true, protectedAdmin: false }), true, 'canonical backend allow opens Insights');
assert.equal(canAccessInsights({ status: 'ready', enabled: false, insightsAllowed: false, protectedAdmin: false }), false, 'canonical backend denial closes Insights');
const protectedAdminAccess = mapCurrentFeatureAccess({ featureKey: 'insights', enabled: false, allowed: true, protectedAdmin: true }, 'insights');
assert.deepEqual(protectedAdminAccess, { featureKey: 'insights', enabled: false, allowed: true, protectedAdmin: true }, 'Protected Admin access is accepted from canonical backend result even if global feature toggle is off');
assert.equal(canAccessInsights({ status: 'ready', enabled: protectedAdminAccess.enabled, insightsAllowed: protectedAdminAccess.allowed, protectedAdmin: protectedAdminAccess.protectedAdmin }), true);

const roleRow = mapFeatureRoleAccessRow({ roleId: 'stable-role-uuid', roleKey: 'custom', roleName: 'Custom Role', roleType: 'custom', governanceLevel: null, isActive: true, isProtected: true, memberCount: 7, allowed: true, effectiveAllowed: true, configurable: false });
assert.equal(roleRow.roleId, 'stable-role-uuid');
assert.equal(roleRow.configurable, false, 'Protected Admin immutability is driven by backend configurability');
const userRow = mapFeatureUserAccessRow({ user_id: 'profile-uuid', profile_code: 'EMP-1', full_name: 'Example Person', status: 'Active', role_id: 'role-uuid', role_name: 'Custom Role', role_active: true, role_allowed: false, override: 'allow', effective_allowed: true, protected_admin: false, configurable: true });
assert.equal(userRow.userId, 'profile-uuid', 'profile UUID is preserved for mutation argument');
assert.equal(userRow.override, 'allow');
assert.equal(userRow.effectiveAllowed, true, 'effective access is taken from backend, not derived from browser permissions');
const directory = mapFeatureAccessPage({ featureKey: 'insights', featureEnabled: true, items: [{ roleId: 'r1', roleName: 'Custom', configurable: true }], pagination: { limit: 25, offset: 25, total: 63 } }, mapFeatureRoleAccessRow);
assert.deepEqual(directory.pagination, { limit: 25, offset: 25, total: 63 }, 'server pagination metadata is retained');

const fixedNow = new Date('2026-09-24T12:00:00.000Z');
for (const preset of ['7d', '30d', '90d', '12m'] as const) {
  const range = createTemplateInsightsDateRange(preset, fixedNow);
  assert.ok(Date.parse(range.startAt) < Date.parse(range.endAt), `${preset} is a non-empty [start,end) range`);
  assert.ok(isSupportedTemplateInsightsRange(range.startAt, range.endAt), `${preset} is within the 366-day RPC maximum`);
}
assert.equal(isSupportedTemplateInsightsRange('2024-01-01T00:00:00Z', '2026-01-01T00:00:00Z'), false);

const main = mapTemplateInsightsResponse({
  range: { startAt: '2026-08-25T12:00:00Z', endAt: '2026-09-24T12:00:00Z', endExclusive: true, trendBucket: 'day' },
  metricDefinitions: { reportsCreated: 'Period count', uniqueUsers: 'Distinct period users', lastUsed: 'Lifetime latest report', neverUsed: 'Zero lifetime reports', currentStatusCounts: 'Current status for period-created reports' },
  summary: { approvedTemplates: 4, approvedTemplatesUsed: 3, approvedTemplatesNeverUsed: 1, templateReportsCreated: 12, uniqueTemplateUsers: 5, approvedTemplatesActiveInPeriod: 2 },
  templates: [{ templateId: 'template-uuid-1', templateDisplayId: 'TMP-0001', templateName: 'Safety', categoryId: 'category-uuid', categoryName: 'Operations', currentVersion: '2.0', status: 'approved', reportsCreated: 3, lifetimeReportsCreated: 8, uniqueUsers: 2, lastUsedAt: '2026-09-20T12:00:00Z', neverUsed: false, currentStatusCounts: { draft: 1, completed: 1, sent: 1, signed: 0, returned: 0, rejected: 0 } }],
  trend: [{ bucketStart: '2026-09-20T00:00:00Z', reportsCreated: 3 }],
  pagination: { limit: 25, offset: 0, total: 4 },
});
assert.equal(main.summary.approvedTemplatesNeverUsed, 1, 'never-used summary stays lifetime-defined by the RPC');
assert.equal(main.templates[0].reportsCreated, 3, 'period reports remain distinct from lifetime reports');
assert.equal(main.templates[0].lifetimeReportsCreated, 8);
assert.equal(main.templates[0].currentStatusCounts.sent, 1);
assert.equal(main.pagination.total, 4, 'server pagination total is retained');

const detail = mapTemplateInsightDetail({
  template: { templateId: 'template-uuid-1', templateDisplayId: 'TMP-0001', templateName: 'Safety', categoryId: 'category-uuid', categoryName: 'Operations', currentVersion: '2.0', status: 'approved' },
  range: { startAt: '2026-08-25T12:00:00Z', endAt: '2026-09-24T12:00:00Z', endExclusive: true, trendBucket: 'day' },
  summary: { lifetimeReportsCreated: 8, reportsCreated: 3, uniqueUsers: 2, lastUsedAt: '2026-09-20T12:00:00Z' },
  currentStatusCounts: { draft: 1, sent: 2 },
  versionUsage: [{ templateVersionId: 'version-uuid-a', versionLabel: '2.0', publishedAt: '2026-08-01T00:00:00Z', lifetimeReportsCreated: 5, reportsCreated: 2 }, { templateVersionId: 'version-uuid-b', versionLabel: '1.0', publishedAt: '2026-06-01T00:00:00Z', lifetimeReportsCreated: 3, reportsCreated: 1 }],
  trend: [{ bucketStart: '2026-09-20T00:00:00Z', reportsCreated: 3 }],
});
assert.equal(detail.versionUsage.length, 2, 'exact version rows remain separate');
assert.deepEqual(detail.versionUsage.map((version) => version.templateVersionId), ['version-uuid-a', 'version-uuid-b']);
assert.equal(detail.summary.lifetimeReportsCreated, 8);
assert.equal(detail.summary.reportsCreated, 3);

const periodSummary = mapTemplateUsagePeriodSummary({
  range: { startAt: '2026-09-17T12:00:00Z', endAt: '2026-09-24T12:00:00Z', endExclusive: true },
  templatesApproved: 2,
  activeTemplates: 1,
  templatesWithNoActivity: 1,
  reportsCreated: 8,
  uniqueUsers: 3,
  reportsPerActiveTemplate: 8,
});
assert.equal(periodSummary.startAt, '2026-09-17T12:00:00Z');
assert.equal(periodSummary.templatesApproved, 2);
assert.equal(periodSummary.activeTemplates, 1);
assert.equal(periodSummary.templatesWithNoActivity, 1);
assert.equal(periodSummary.reportsCreated, 8);
assert.equal(periodSummary.uniqueUsers, 3);
assert.equal(periodSummary.reportsPerActiveTemplate, 8);

const dailyTrend = normalizeTemplateUsageTrend([
  { bucketStart: '2026-09-20T00:00:00.000Z', reportsCreated: 4 },
  { bucketStart: '2026-09-18T00:00:00.000Z', reportsCreated: 2 },
], '2026-09-18T00:00:00.000Z', '2026-09-21T00:00:00.000Z', '7d', 'day');
assert.deepEqual(dailyTrend.map((point) => point.reportsCreated), [2, 0, 4], 'missing daily buckets are zero-filled, not interpolated');
assert.deepEqual(dailyTrend.map((point) => point.bucketStart), [...dailyTrend.map((point) => point.bucketStart)].sort(), 'trend is oldest to newest');
assert.equal(dailyTrend[1].tooltipLabel, 'September 19, 2026');
assert.equal(dailyTrend[1].label, 'Sep 19');
assert.equal(dailyTrend[0].reportsCreated, 2, 'observed counts are preserved exactly');

const weeklyTrend = normalizeTemplateUsageTrend([], '2026-09-01T00:00:00.000Z', '2026-09-22T00:00:00.000Z', '90d', 'week');
assert.equal(weeklyTrend.length, 4);
assert.equal(weeklyTrend[0].tooltipLabel, 'Week of August 31, 2026');
assert.ok(weeklyTrend.every((point) => point.reportsCreated === 0));

const monthlyTrend = normalizeTemplateUsageTrend([], '2026-07-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z', '12m', 'month');
assert.deepEqual(monthlyTrend.map((point) => point.tooltipLabel), ['July 2026', 'August 2026', 'September 2026']);
console.log('Phase 4C Template Insights runtime tests passed.');
