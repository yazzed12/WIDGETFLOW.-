import assert from 'node:assert/strict';
import {
  confirmsDelegatedAuthority,
  confirmsOwnAuthority,
  canCreateTemplateBackedReport,
  canAuthorTemplate,
  canEditTemplateDraft,
  hasEffectiveAuthorityPermission,
} from '../../src/features/delegations/effectiveAuthority';
import {
  belongsToOperationalSubject,
  operationalOwnerUserId,
} from '../../src/features/delegations/operationalWorkspaceFilters';
import { runExclusiveAction } from '../../src/features/workspace/workspaceRequestControl';

const actorPermissions = ['reports.view_own', 'templates.view_approved'];
const delegatedPermissions = ['reports.create', 'reports.view_own', 'templates.view_approved', 'templates.use', 'reports.edit_draft', 'reports.complete', 'reports.send', 'templates.create', 'templates.submit'];

assert.equal(hasEffectiveAuthorityPermission({
  mode: 'own', actorPermissions, effectivePermissions: delegatedPermissions,
}, 'reports.view_own'), true, 'My Role uses the authenticated actor permissions');
assert.equal(hasEffectiveAuthorityPermission({
  mode: 'own', actorPermissions, effectivePermissions: delegatedPermissions,
}, 'reports.create'), false, 'own mode does not gain delegated authority permissions');
assert.equal(hasEffectiveAuthorityPermission({
  mode: 'delegated', actorPermissions, effectivePermissions: delegatedPermissions,
}, 'reports.create'), true, 'delegated operational authoring uses selected authority permissions');
assert.equal(hasEffectiveAuthorityPermission({
  mode: 'delegated', actorPermissions, effectivePermissions: delegatedPermissions,
}, 'templates.view_approved'), true, 'delegated mode uses the effective authority permission list');
assert.equal(hasEffectiveAuthorityPermission({
  mode: 'delegated', actorPermissions: ['notifications.view'], effectivePermissions: delegatedPermissions,
}, 'notifications.view'), false, 'delegated mode does not union personal actor permissions');
assert.equal(hasEffectiveAuthorityPermission({ mode: 'delegated', actorPermissions }, 'reports.create'), false, 'missing authority permissions fail closed');
assert.equal(hasEffectiveAuthorityPermission(null, 'reports.create'), false, 'missing authority context fails closed');

const reportPermissionSet = new Set(['reports.create', 'reports.view_own', 'templates.view_approved', 'templates.use']);
const hasReportPermission = (permission: 'reports.create' | 'reports.view_own' | 'templates.view_approved' | 'templates.use') => reportPermissionSet.has(permission);
assert.equal(canCreateTemplateBackedReport(hasReportPermission), true, 'own and delegated template-backed creation accept the exact complete RPC permission set');
for (const missingPermission of ['reports.create', 'reports.view_own', 'templates.view_approved', 'templates.use'] as const) {
  assert.equal(canCreateTemplateBackedReport((permission) => permission !== missingPermission && hasReportPermission(permission)), false, `template-backed report flow fails closed when ${missingPermission} is absent`);
}
assert.equal(canAuthorTemplate((permission) => permission === 'templates.create'), true, 'templates.create opens the existing Studio without requiring studio.access');
assert.equal(canAuthorTemplate((permission) => (permission as string) === 'studio.access'), false, 'studio.access alone does not grant template authoring');
assert.equal(canAuthorTemplate((permission) => permission === 'templates.edit_own_draft', 'existing-template'), true, 'edit-own-draft opens an existing editable Studio');
assert.equal(canEditTemplateDraft((permission) => permission === 'templates.edit_own_draft'), true, 'existing drafts use operational edit permission');
assert.equal(canEditTemplateDraft((permission) => (permission as string) === 'studio.access'), false, 'Studio access alone cannot grant draft editing');

const delegatedReport = {
  createdById: 'gamal-actor',
  operationalSubjectUserId: 'hassan-subject',
};
assert.equal(operationalOwnerUserId(delegatedReport), 'hassan-subject');
assert.equal(belongsToOperationalSubject(delegatedReport, 'hassan-subject'), true, 'delegated report belongs to the operational subject');
assert.equal(belongsToOperationalSubject(delegatedReport, 'gamal-actor'), false, 'actual creator is not substituted for operational ownership');
assert.equal(belongsToOperationalSubject({ createdById: 'gamal-actor' }, 'gamal-actor'), true, 'legacy rows without the new field retain their original owner mapping');
assert.equal(belongsToOperationalSubject({ createdById: 'gamal-actor', operationalSubjectUserId: null }, 'gamal-actor'), false, 'an explicitly unowned row is not reassigned to its physical creator');

const confirmedDelegatedContext = {
  mode: 'delegated' as const,
  staleSelection: false,
  delegation: { delegationId: 'delegation-hassan', delegatedByUserId: 'hassan-subject' },
  actor: { userId: 'gamal-actor' },
  operationalSubject: { userId: 'hassan-subject' },
};
assert.equal(confirmsDelegatedAuthority(confirmedDelegatedContext, 'delegation-hassan'), true, 'canonical context confirms the requested delegation');
assert.equal(confirmsDelegatedAuthority(confirmedDelegatedContext, 'delegation-karim'), false, 'a different canonical delegation is not a successful transition');
assert.equal(confirmsDelegatedAuthority({ ...confirmedDelegatedContext, staleSelection: true }, 'delegation-hassan'), false, 'stale selected context fails closed');
assert.equal(confirmsDelegatedAuthority({ ...confirmedDelegatedContext, delegation: { delegationId: 'delegation-hassan', delegatedByUserId: 'someone-else' } }, 'delegation-hassan'), false, 'delegation and operational subject must agree');

assert.equal(confirmsOwnAuthority({
  mode: 'own', staleSelection: false, delegation: null,
  actor: { userId: 'gamal-actor' }, operationalSubject: { userId: 'gamal-actor' },
}), true, 'Return to My Role is confirmed by canonical own context');
assert.equal(confirmsOwnAuthority({
  mode: 'delegated', delegation: confirmedDelegatedContext.delegation,
  actor: { userId: 'gamal-actor' }, operationalSubject: { userId: 'hassan-subject' },
}), false, 'a remaining delegated selection is not reported as a successful return');

const transitionLock = { current: false };
let transitionCalls = 0;
let releaseTransition!: () => void;
const transitionGate = new Promise<void>((resolve) => { releaseTransition = resolve; });
const activeTransition = runExclusiveAction(transitionLock, async () => {
  transitionCalls += 1;
  await transitionGate;
  return true;
}, false);
const duplicateTransition = await runExclusiveAction(transitionLock, async () => {
  transitionCalls += 1;
  return true;
}, false);
assert.equal(duplicateTransition, false, 'a duplicate authority transition is ignored while the first is active');
assert.equal(transitionCalls, 1, 'duplicate clicks do not start a competing transition');
releaseTransition();
assert.equal(await activeTransition, true, 'the first authority transition preserves its result');
assert.equal(transitionLock.current, false, 'the transition lock clears after completion');

console.log('delegated authority permissions, ownership, and canonical transition runtime tests passed');
