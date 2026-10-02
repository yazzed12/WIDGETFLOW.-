import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuickActions } from '../../src/components/dashboard/QuickActions';
import { buildDashboardQuickActions } from '../../src/components/dashboard/quickActionModel';
import { mapAuthorityContext } from '../../src/features/delegations/delegationMapper';
import { hasEffectiveAuthorityPermission } from '../../src/features/delegations/effectiveAuthority';
import { selectTemplateFromLibrary } from '../../src/features/templates/templateSelection';
import type { AuthorityContext } from '../../src/features/delegations/delegationTypes';

const directorPermissions = [
  'reports.create',
  'reports.view_own',
  'templates.view_approved',
  'templates.use',
  'templates.create',
  'templates.edit_own_draft',
  'templates.submit',
  'template_approvals.view',
];
const employeePermissions = ['reports.view_own', 'templates.view_approved'];

const ownEmployee = mapAuthorityContext({
  mode: 'own',
  actor: { user_id: 'gamal', full_name: 'Gamal', role_id: 'employee', role_name: 'Employee' },
  operational_subject: { user_id: 'gamal', full_name: 'Gamal', role_id: 'employee', role_key: 'employee', role_name: 'Employee' },
  authority: { role_id: 'employee', role_key: 'employee', role_name: 'Employee', effective_permissions: employeePermissions },
});

// This response shape keeps authority identity nested but returns the current
// canonical effective permission list as a sibling field.
const delegatedDirector = mapAuthorityContext({
  mode: 'delegated',
  actor: { user_id: 'gamal', full_name: 'Gamal', role_id: 'employee', role_name: 'Employee' },
  delegation: {
    delegation_id: 'hassan-delegation', delegated_by_user_id: 'hassan', delegated_by_name: 'Hassan',
    start_at: '2026-10-01T00:00:00Z', end_at: '2026-10-14T23:59:00Z',
  },
  operational_subject: { user_id: 'hassan', full_name: 'Hassan', role_id: 'director', role_key: 'director', role_name: 'Director' },
  authority: { role_id: 'director', role_key: 'director', role_name: 'Director', effective_permissions: [] },
  effective_permissions: directorPermissions,
});

assert.deepEqual(delegatedDirector.authority.effectivePermissions, directorPermissions);

function renderDashboardActionTitles(context: AuthorityContext): string[] {
  const hasOperationalPermission = (permission: string) => hasEffectiveAuthorityPermission({
    mode: context.mode,
    actorPermissions: context.mode === 'delegated' ? employeePermissions : context.authority.effectivePermissions,
    effectivePermissions: context.authority.effectivePermissions,
  }, permission);
  const hasTemplateApprovalPermission = (permission: 'template_approvals.view') => hasOperationalPermission(permission);
  const actions = buildDashboardQuickActions({
    hasOperationalPermission,
    hasTemplateApprovalPermission,
    isDelegatedMode: context.mode === 'delegated',
    myRequestsCount: 0,
    pendingApprovalsCount: 0,
    onCreateTemplate: () => undefined,
    onCreateReport: () => undefined,
    onMyRequests: () => undefined,
    onApprovals: () => undefined,
    onStickyNotes: () => undefined,
  });
  const markup = renderToStaticMarkup(React.createElement(QuickActions, { actions }));
  return ['Create New Template', 'Create Report', 'My Requests', 'Approvals', 'Sticky Notes']
    .filter((title) => markup.includes(title));
}

const delegatedTitles = renderDashboardActionTitles(delegatedDirector);
assert.deepEqual(delegatedTitles, ['Create New Template', 'Create Report', 'My Requests', 'Approvals']);
assert.ok(delegatedTitles.includes('Create New Template'), 'the existing Dashboard Template action renders for effective templates.create');
assert.ok(delegatedTitles.includes('Create Report'), 'the existing Dashboard Report action renders for effective reports.create');

const normalDirector = mapAuthorityContext({
  mode: 'own',
  actor: { user_id: 'hassan', full_name: 'Hassan', role_id: 'director', role_name: 'Director' },
  operational_subject: { user_id: 'hassan', full_name: 'Hassan', role_id: 'director', role_key: 'director', role_name: 'Director' },
  authority: { role_id: 'director', role_key: 'director', role_name: 'Director', effective_permissions: directorPermissions },
});
const normalDirectorOperationalTitles = renderDashboardActionTitles(normalDirector).filter((title) => title !== 'Sticky Notes');
assert.deepEqual(delegatedTitles, normalDirectorOperationalTitles, 'delegated operational UI matches the normal Director Dashboard action set');

const employeeTitles = renderDashboardActionTitles(ownEmployee);
assert.ok(!employeeTitles.includes('Create New Template'), 'Employee My Role does not see Create Template without templates.create');
assert.ok(!employeeTitles.includes('Create Report'), 'Employee My Role does not see Create Report without reports.create');

let selectedTemplateAction = '';
const template = { id: 'template-1', isPaused: false };
selectTemplateFromLibrary(template, true, () => { selectedTemplateAction = 'use'; }, () => { selectedTemplateAction = 'preview'; });
assert.equal(selectedTemplateAction, 'use', 'authorized selectable Dashboard/library cards open the existing report fill flow');
selectTemplateFromLibrary(template, false, () => { selectedTemplateAction = 'use'; }, () => { selectedTemplateAction = 'preview'; });
assert.equal(selectedTemplateAction, 'preview', 'when Use is unavailable, selectable cards open the existing preview');
selectTemplateFromLibrary({ ...template, isPaused: true }, true, () => { selectedTemplateAction = 'use'; }, () => { selectedTemplateAction = 'preview'; });
assert.equal(selectedTemplateAction, 'preview', 'paused templates cannot enter the Use flow from card selection');

console.log('delegated Dashboard action rendering runtime tests passed');
