import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const assignment = read('src/features/delegations/operationalReportAssignment.ts');
const context = read('src/context/AppContext.tsx');
const dashboard = read('src/pages/DashboardPage.tsx');
const reportsPage = read('src/pages/ReportsPage.tsx');
const reportView = read('src/components/reports/ReportViewModal.tsx');
const reportRepo = read('src/features/reports/reportRepository.ts');
const signatureModal = read('src/components/report/ReportSignatureModal.tsx');
const notifications = read('src/pages/NotificationsPage.tsx');
const reportService = read('src/features/reports/reportService.ts');
const signatureProvenance = read('src/features/reports/signatureProvenance.ts');
const app = read('src/App.tsx');
const templates = read('src/features/templates/repositories/templateRepository.ts');

assert.match(assignment, /assignment\.recipientUserId === operationalSubjectUserId/);
assert.match(assignment, /assignment\.sendCycleId === report\.currentSendCycleId/);
assert.match(context, /const reportAssignmentForAction = \(report: ReportInstance \| undefined\) => \{[\s\S]*getOperationalReportAssignment\(report, operationalSubjectForReportAction\(\)\)/);
assert.match(context, /const getReportDetail = \(reportId: string\): Promise<ReportInstance> => \{[\s\S]*runSingleFlight\(reportDetailFlights\.current, flightKey, async \(\) => \{[\s\S]*recoverOnceAndRetry\(\(\) => reportService\.get\(reportId\)\)/, 'coalesced detail reads use authenticated-session recovery');
for (const action of ['returnReport', 'rejectReport', 'signReport']) {
  const start = context.indexOf(`const ${action} = async`);
  assert.notEqual(start, -1, `${action} handler exists`);
  const body = context.slice(start, start + 2800);
  assert.match(body, /reportAssignmentForAction\(report\)/, `${action} resolves the operational subject’s original assignment`);
  assert.match(body, /assignment\.id/, `${action} passes the original assignment UUID to its existing service`);
}
assert.match(reportRepo, /rpc\('return_report'[\s\S]*p_assignment_id: assignmentId/);
assert.match(reportRepo, /rpc\('reject_report'[\s\S]*p_assignment_id: assignmentId/);
assert.match(reportRepo, /rpc\('sign_report'[\s\S]*p_assignment_id: assignmentId/);
assert.match(context, /Promise\.all\(\[refreshReports\(\), refreshNotifications\(\)\]\)/);
assert.match(context, /refreshAuthorityContext\(\)/);
assert.match(context, /setActiveView\('dashboard'\)/);
assert.match(context, /clearWorkspaceDetails\(\)/);
assert.match(context, /authorityContextRef\.current\?\.mode === 'delegated'[\s\S]*operationalSubject\.userId/);
assert.match(context, /sameDelegationStillActive[\s\S]*context\.delegation\?\.delegationId === actionAuthority\?\.delegationId/);
assert.match(dashboard, /getOperationalReportAssignment\(rep, workspaceSubjectId\)/, 'dashboard resolves the operational subject assignment');
assert.match(dashboard, /hasOperationalReportSignatureAssignment\(rep, assignment, workspaceSubjectId\)/, 'dashboard checks only the operational subject signature mapping');
assert.match(dashboard, /recipientCanAct && isSettingEnabled\('allow_return'\)[\s\S]*hasOperationalPermission\('reports\.return'\)/);
assert.match(dashboard, /recipientCanAct && rep\.sourceType === 'template' && isSettingEnabled\('allow_rejection'\)[\s\S]*hasOperationalPermission\('reports\.reject'\)/);
assert.match(dashboard, /recipientCanAct && rep\.sourceType === 'template' && hasSignatureMapping && isSettingEnabled\('digital_signature'\)[\s\S]*hasOperationalPermission\('reports\.sign'\)/);
const dashboardActions = dashboard.slice(dashboard.indexOf('userRelevantReports.map'), dashboard.indexOf('Popular Report Templates'));
assert.doesNotMatch(dashboardActions, /recipientUserId === currentUser\.id/, 'dashboard action selection never substitutes the real actor for the operational recipient');

assert.match(signatureModal, /signatureService\.getMySignatureProfile\(\)/);
assert.doesNotMatch(signatureModal, /getSignatureProfile\(\s*(?:operationalSubject|delegatedBy)/);
assert.match(signatureModal, /profile\.userId !== currentUser\.id/);
assert.match(signatureModal, /Signing as:<\/strong> \{currentUser\.name\} — \{currentUser\.role\}/);
assert.match(signatureModal, /Your own saved signature will be used/);
assert.match(signatureModal, /onConfirm\(isSupabaseReport[\s\S]*confirmationStatement/);

assert.match(reportsPage, /getOperationalReportAssignment\(rep, subjectId\)/);
assert.match(reportsPage, /hasOperationalReportSignatureAssignment\(rep, operationalAssignment, subjectId\)/);
assert.match(reportView, /getOperationalReportAssignment\(report, subjectId\)/);
assert.match(reportView, /Acting as \{record\.authorityRoleName \|\| 'delegated authority'\} for \{record\.delegatedByName\}/);
assert.match(reportView, /record\.delegationId/);
assert.match(reportView, /getDelegatedSignatureSnapshot\(latestSignature\)/);
assert.match(reportsPage, /getDelegatedSignatureSnapshot\(latestSignature\)/);
assert.match(signatureProvenance, /immutable event snapshots only/);
assert.match(reportService, /signer_user_id/);
assert.match(reportService, /delegated_by_name_snapshot/);
assert.match(reportService, /authority_role_name_snapshot/);
assert.match(reportService, /REPORT_FULLY_SIGNED: 'Fully Signed'/);

assert.match(notifications, /n\.userId === currentUser\.id/);
assert.match(notifications, /report_received_delegated/);
assert.match(notifications, /openDelegatedReportNotification\(notif\.delegationId, notif\.relatedReportId\)/);
assert.match(context, /recoverOnceAndRetry\(\(\) => delegationService\.selectContext\(delegationId\)\)/);
assert.match(context, /confirmedContext = await recoverOnceAndRetry\(\(\) => delegationService\.currentAuthorityContext\(\)\)/);
assert.match(context, /const latestContext = await revalidateAuthorityContext\(\)/);
const deepLinkStart = context.indexOf('const openDelegatedReportNotification = async');
const deepLinkEnd = context.indexOf('const clearDelegationContext = async', deepLinkStart);
const deepLink = context.slice(deepLinkStart, deepLinkEnd);
assert.ok(deepLink.indexOf('selectDelegationContext(delegationId)') < deepLink.indexOf('getReportDetail(reportId)'), 'selection/revalidation precedes report loading');
const finalContextCheck = deepLink.indexOf('const latestContext = await revalidateAuthorityContext()');
assert.ok(deepLink.indexOf('getReportDetail(reportId)') < finalContextCheck, 'context is checked again after the report read');
assert.ok(finalContextCheck < deepLink.indexOf('setSelectedReportForView(report)'), 'report is not opened until the final context check');
assert.match(deepLink, /catch \(error\)[\s\S]*revalidateAuthorityContext\(\)[\s\S]*latestContext\.mode !== 'delegated'[\s\S]*setActiveView\('dashboard'\)/);
assert.match(app, /selectedTemplateForFill && canCreateTemplateBackedReport\(hasOperationalPermission\)/);
assert.match(context, /templateService\.getTemplates\(\)/);
assert.match(templates, /async getTemplates\(\) \{ const c = getSupabaseBrowserClient\(\); return readTemplates\(c\.from\('templates'\)/);
assert.doesNotMatch(templates, /async getTemplates\([^)]*(?:userId|operationalSubject)/);

console.log('delegated report frontend integration static checks passed');
