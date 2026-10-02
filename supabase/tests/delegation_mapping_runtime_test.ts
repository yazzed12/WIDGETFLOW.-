import assert from 'node:assert/strict';
import { mapAuthorityContext, mapDelegationRecord, mapPage } from '../../src/features/delegations/delegationMapper';
import { canReviewVisibleTemplate } from '../../src/features/templates/templateApprovalVisibility';
import { belongsToOperationalSubject, isOperationallyRelevantReport } from '../../src/features/delegations/operationalWorkspaceFilters';

const context = mapAuthorityContext({
  mode: 'delegated',
  actor: { user_id: 'actor-y', full_name: 'Youssef Ali', role_id: 'employee-role', role_name: 'Employee' },
  delegation: { delegation_id: 'delegation-1', delegated_by_user_id: 'director-x', delegated_by_name: 'Ahmed Hassan', start_at: '2026-10-01T00:00:00Z', end_at: '2026-10-14T23:59:00Z' },
  operational_subject: { user_id: 'director-x', full_name: 'Ahmed Hassan', role_id: 'director-role', role_key: 'director', role_name: 'Director', governance_level: 'director' },
  authority: {
    role_id: 'director-role', role_key: 'director', role_name: 'Director', governance_level: 'director',
    effective_permissions: ['reports.create', 'reports.view_own', 'templates.view_approved', 'templates.use', 'templates.create'],
  },
  stale_selection: false,
});
assert.equal(context.mode, 'delegated');
assert.equal(context.actor.userId, 'actor-y');
assert.equal(context.actor.roleName, 'Employee');
assert.equal(context.delegation?.delegatedByName, 'Ahmed Hassan');
assert.equal(context.operationalSubject.userId, 'director-x');
assert.equal(context.operationalSubject.roleKey, 'director');
assert.equal(context.authority.roleName, 'Director');
assert.deepEqual(context.authority.effectivePermissions, ['reports.create', 'reports.view_own', 'templates.view_approved', 'templates.use', 'templates.create']);
assert.equal(context.staleSelection, false);

const page = mapPage({ total_count: 1, rows: [{
  delegation_id: 'delegation-1', delegator_user_id: 'director-x', delegator_name: 'Ahmed Hassan',
  delegator_role_name: 'Director', delegate_user_id: 'actor-y', delegate_name: 'Youssef Ali',
  authority_role_id: 'director-role', authority_role_key: 'director', authority_role_name: 'Director',
  start_at: '2026-10-01T00:00:00Z', end_at: '2026-10-14T23:59:00Z', status: 'active',
}] }, mapDelegationRecord, 25, 0);
assert.equal(page.totalCount, 1);
assert.equal(page.rows[0]?.status, 'active');
assert.equal(page.rows[0]?.delegateName, 'Youssef Ali');
assert.equal(page.rows[0]?.authorityRoleName, 'Director');

const own = mapAuthorityContext({
  mode: 'own', staleSelection: true,
  actor: { user_id: 'actor-y', full_name: 'Youssef Ali', role_id: 'employee-role', role_name: 'Employee' },
  operational_subject: { user_id: 'actor-y', full_name: 'Youssef Ali', role_id: 'employee-role', role_key: 'employee', role_name: 'Employee', governance_level: 'employee' },
  authority: { role_id: 'employee-role', role_key: 'employee', role_name: 'Employee', governance_level: 'employee' },
});
assert.equal(own.mode, 'own');
assert.equal(own.staleSelection, true);
assert.equal(own.operationalSubject.userId, 'actor-y', 'own workspace uses the authenticated actor as the operational subject');
assert.throws(() => mapAuthorityContext({ mode: 'delegated', actor: {}, authority: {} }), /Incomplete authority context/);
assert.throws(() => mapAuthorityContext({ mode: 'unrecognized', actor: {}, authority: {} }), /Invalid authority context mode/);

const report = { createdById: 'director-x', sentToId: null, assignments: [{ recipientUserId: 'reviewer-z' }] };
assert.equal(belongsToOperationalSubject(report, 'director-x'), true);
assert.equal(belongsToOperationalSubject(report, 'actor-y'), false, 'delegated reads use subject ID, not the signed-in actor ID');
assert.equal(isOperationallyRelevantReport(report, 'director-x'), true);
assert.equal(isOperationallyRelevantReport(report, 'reviewer-z'), true);
assert.equal(isOperationallyRelevantReport(report, 'unrelated-user'), false);

const pendingTemplate = { status: 'Pending Approval' as const, createdById: 'employee-owner' };
assert.equal(canReviewVisibleTemplate(pendingTemplate, 'eligible-reviewer', true), true, 'RLS-visible unclaimed role queue and delegated specific-user review are actionable');
assert.equal(canReviewVisibleTemplate(pendingTemplate, 'employee-owner', true), false, 'creator cannot review own template');
assert.equal(canReviewVisibleTemplate(pendingTemplate, 'unrelated-user', false), false, 'user without canonical inbox visibility cannot review');
assert.equal(canReviewVisibleTemplate({ ...pendingTemplate, status: 'Approved' }, 'eligible-reviewer', true), false, 'non-pending template has no reviewer actions');
console.log('delegation mapping runtime tests passed');
