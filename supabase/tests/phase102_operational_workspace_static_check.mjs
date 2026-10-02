import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const context = read('src/context/AppContext.tsx');
const mapper = read('src/features/delegations/delegationMapper.ts');
const repository = read('src/features/reports/reportRepository.ts');
const templates = read('src/features/templates/repositories/templateRepository.ts');
const app = read('src/App.tsx');
const dashboard = read('src/pages/DashboardPage.tsx');
const reports = read('src/pages/ReportsPage.tsx');
const requests = read('src/pages/MyRequestsPage.tsx');
const navbar = read('src/components/layout/Navbar.tsx');
const monitor = read('src/components/dashboard/WorkflowMonitor.tsx');
const reportModal = read('src/components/reports/ReportViewModal.tsx');
const requestDrawer = read('src/components/requests/RequestDetailDrawer.tsx');
const sidebar = read('src/components/layout/Sidebar.tsx');

assert.match(context, /const currentUser = authenticatedPrincipal/);
assert.match(context, /const operationalSubjectUserId = operationalSubject\?\.userId \?\? null/);
assert.match(context, /context\.actor\.userId !== currentUser\.id/);
assert.match(mapper, /operationalSubject:[\s\S]*userId:[\s\S]*roleKey:/);
assert.match(mapper, /Invalid authority context mode/);
assert.match(mapper, /mapped\.operationalSubject\.userId !== mapped\.delegation\.delegatedByUserId/);
assert.match(context, /setTemplates\(\[\]\); setMyTemplates\(\[\]\); setPendingTemplateApprovals\(\[\]\); setReports\(\[\]\)/);
assert.match(context, /requestId === templateLoadRequest\.current && expectedWorkspaceRequest === workspaceLoadRequest\.current/);
assert.match(context, /requestId === reportLoadRequest\.current && expectedWorkspaceRequest === workspaceLoadRequest\.current/);
assert.match(context, /void refreshTemplates\(true, workspaceRequest\);[\s\S]*const reportsReady = await refreshReports\(workspaceRequest\)/);
assert.match(context, /if \(!authenticatedSessionReady \|\| expectedWorkspaceRequest !== workspaceLoadRequest\.current\) return false/);
assert.match(context, /setActiveView\('dashboard'\)/);
assert.match(context, /window\.addEventListener\('focus', refreshWhenVisible\)/);
assert.match(context, /document\.visibilityState === 'visible'\) void revalidateAuthorityContext\(\)/);
assert.doesNotMatch(context.match(/const refreshWhenVisible = \(\) => \{[\s\S]*?\n\s*\};/)?.[0] ?? '', /refreshAuthorityContext/);
assert.match(context, /window\.setTimeout\(checkExpiry/);
assert.match(context, /rawCode === 'DELEGATION_CONTEXT_INVALID'/);
assert.match(context, /rawCode === 'DELEGATION_NOT_ACTIVE_OR_NOT_ASSIGNED'/);

// Backend RLS remains the source of read visibility; neither list accepts a client-selected subject ID.
assert.match(repository, /async list\(\)[\s\S]*from\('reports'\)\.select/);
assert.doesNotMatch(repository, /async list\(\s*userId/);
assert.match(templates, /async getMyTemplates\(\)[\s\S]*from\('templates'\)\.select/);
assert.doesNotMatch(templates, /getMyTemplates\(userId/);
assert.match(app, /canOpenOperationalReadView\('reports'\)/);
assert.match(app, /canOpenOperationalReadView\('templates'\)/);
assert.match(app, /canOpenOperationalReadView\('my-requests'\)/);

assert.match(reports, /const subjectId = operationalSubjectUserId \?\? ''/);
assert.match(reports, /const isAuthor = belongsToOperationalSubject\(rep, subjectId\)/);
assert.match(reports, /rep\.sourceType === 'template'.*hasOperationalPermission\('reports\.edit_draft'\)/);
assert.match(reports, /canShowRecipientActions && isAssignedRecipient && rep\.status === 'Sent'/);
assert.match(reports, /getOperationalReportAssignment\(rep, subjectId\)/);
assert.match(dashboard, /belongsToOperationalSubject\(r, workspaceSubjectId\)/);
assert.match(dashboard, /const canShowDelegatedActions = !isDelegatedMode \|\| \(isPersistedReport && rep\.sourceType === 'template'\)/);
assert.match(dashboard, /recipientCanAct && isSettingEnabled\('allow_return'\)[\s\S]*hasOperationalPermission\('reports\.return'\)/);
assert.match(requests, /getMyRequestsForUser/);
assert.match(requests, /const isOperationalOwner = \(template: import\('\.\.\/types'\)\.WidgetTemplate\) =>[\s\S]*belongsToOperationalSubject\(template, operationalSubjectUserId \?\? ''\)/);
assert.match(monitor, /operationalSubjectId/);
assert.doesNotMatch(monitor, /data-delegated-read-only/);
assert.match(monitor, /workspaceKey/);
assert.match(monitor, /report\.status === 'Returned' && operationalOwnerUserId\(report\) === operationalSubjectId/, 'returned-report attention follows the operational subject, not the physical creator');
assert.match(monitor, /activityWasPreviouslyLoaded/, 'activity is refreshed only when it was previously loaded');
assert.match(requests, /authorityContext\?\.operationalSubject\.fullName/, 'delegated My Requests identifies whose workspace is being viewed');
assert.match(dashboard, /hasPermission=\{hasOperationalPermission\}/);
assert.match(reportModal, /const isAuthor = belongsToOperationalSubject\(report, subjectId\)/);
assert.match(reportModal, /canShowRecipientActions && isAssignedRecipient && report\.status === 'Sent'/);
assert.match(reportModal, /getOperationalReportAssignment\(report, subjectId\)/);
assert.match(requestDrawer, /!isDelegatedMode && <div className="pt-4 border-t border-slate-200">/);
assert.match(sidebar, /canOpenOperationalReadView\('reports'\)/);
assert.match(reportModal, /operationalSubjectUserId/);
assert.match(navbar, /const subjectId = operationalSubjectUserId \?\? ''/);

// Personal notification state intentionally remains scoped to the signed-in actor.
assert.match(context, /listNotifications\(currentUser\.id\)/);
assert.match(navbar, /n\.userId === currentUser\.id/);
assert.doesNotMatch(context, /listNotifications\(.*operationalSubject/);

console.log('Phase 102 operational workspace static checks passed');
