import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const auth = read('src/features/auth/AuthContext.tsx');
const authRepository = read('src/features/auth/supabaseAuthRepository.ts');
const supabaseClient = read('src/lib/supabase/client.ts');
const context = read('src/context/AppContext.tsx');
const repository = read('src/features/reports/reportRepository.ts');
const reportService = read('src/features/reports/reportService.ts');
const monitor = read('src/components/dashboard/WorkflowMonitor.tsx');
const dashboard = read('src/pages/DashboardPage.tsx');
const reportsPage = read('src/pages/ReportsPage.tsx');
const workspaceHelpers = read('src/features/workspace/workspaceRequestControl.ts');
const delegationsPage = read('src/pages/DelegationsPage.tsx');

// One browser client, with persistent session and auto-refresh. No public fallback client is constructed.
assert.equal((supabaseClient.match(/\bcreateClient\s*\(/g) ?? []).length, 1);
assert.match(supabaseClient, /let browserClient: SupabaseClient \| null = null/);
assert.match(supabaseClient, /persistSession:\s*true/);
assert.match(supabaseClient, /autoRefreshToken:\s*true/);
assert.match(supabaseClient, /publishableKeyConfigured:\s*Boolean\(publishableKey\)/);
assert.doesNotMatch(supabaseClient, /console\.(?:info|log|warn)\([^\n]*(?:supabaseUrl|publishableKey)\s*[,}]/);

// Canonical principal resolution gates AppProvider construction; no AppContext exists during bootstrap.
assert.match(app, /status !== 'authenticated' \|\| !appUser/);
assert.match(app, /<AppProvider key=\{`\$\{appUser\.id\}:\$\{sessionGeneration\}`\}/);
assert.match(auth, /principal\.userId !== session\.user\.id/);
assert.match(auth, /await authService\.currentSession\(\)/);
assert.match(auth, /const resolution = establishSession\(session\);\s*const resolutionGeneration = generationRef\.current;\s*const principal = await resolution;\s*return resolutionGeneration === generationRef\.current \? principal : null;/);
assert.match(authRepository, /auth\.getSession\(\)/);
assert.match(context, /isAuthenticatedSessionReady\(authStatus, session\?\.user\.id, currentUser\.id\)/);
assert.match(context, /if \(!authenticatedSessionReady\) return/);
assert.match(context, /recoverOnceAndRetry/);
assert.match(workspaceHelpers, /export function isAuthenticatedSessionReady/);
assert.match(workspaceHelpers, /export function isAuthenticationFailure/);
assert.match(workspaceHelpers, /export function sameAuthenticatedActor/);

// Routine access-token refresh updates session state only; it does not fetch current_principal again.
const refreshedBranch = auth.match(/if \(event === 'TOKEN_REFRESHED'[\s\S]*?\n\s*\}\n\s*if \(event === 'TOKEN_REFRESHED'/)?.[0] ?? '';
assert.match(refreshedBranch, /commitState\(\{ \.\.\.current, session, authUser: session\.user \}\)/);
assert.doesNotMatch(refreshedBranch, /establishSession|resolvePrincipal/);
assert.match(auth, /current\.session\.access_token === session\.access_token/);
assert.match(auth, /auth\.resolvePrincipal/);
assert.match(auth, /\[WidgetFlow auth event\]/);

// Focus is a lightweight authority revalidation. It must not trigger a full collection reload when unchanged.
assert.match(context, /document\.visibilityState === 'visible'\) void revalidateAuthorityContext\(\)/);
assert.match(context, /authorityContextIdentity\(context\) === authorityContextIdentity\(before\)/);
assert.doesNotMatch(context.match(/const refreshWhenVisible = \(\) => \{[\s\S]*?\n\s*\};/)?.[0] ?? '', /refreshAuthorityContext/);
assert.match(context, /runSingleFlight\(authorityFlights\.current/);
assert.match(context, /runSingleFlight\(revalidationFlights\.current/);
assert.match(context, /runSingleFlight\(reportFlights\.current/);
assert.match(context, /runSingleFlight\(templateFlights\.current/);
assert.match(context, /runSingleFlight\(notificationFlights\.current/);
assert.match(context, /requestId === reportLoadRequest\.current && expectedWorkspaceRequest === workspaceLoadRequest\.current/);
assert.match(context, /requestId === templateLoadRequest\.current && expectedWorkspaceRequest === workspaceLoadRequest\.current/);
assert.match(context, /const markActivityTimelineLoaded = useCallback\(\(\) => setActivityTimelineWasLoaded\(true\), \[\]\)/);
assert.doesNotMatch(delegationsPage.match(/const actAs = async[\s\S]*?\n\s*\};/)?.[0] ?? '', /refreshAuthorityContext/);

// Essential report list is narrow; values, audit, document/version and signature-history detail is fetched by get().
const listMethod = repository.match(/async list\(\) \{[\s\S]*?\n\s*\},\n\s*async get\(/)?.[0] ?? '';
const detailMethod = repository.match(/async get\(id: string\) \{[\s\S]*?\n\s*\},\n\s*async create\(/)?.[0] ?? '';
assert.match(repository, /const REPORT_LIST_SELECT =/);
assert.match(listMethod, /REPORT_LIST_SELECT/);
assert.doesNotMatch(listMethod, /report_values|report_audit_events|report_document_versions|report_send_cycles|template_versions|report_signature_events|report_signature_configurations/);
assert.match(listMethod, /attachCurrentCycleSignatureMappings/);
assert.match(detailMethod, /report_values\(\*\), report_assignments\(\*\), report_audit_events\(\*\)/);
assert.match(detailMethod, /attachTemplateDetailState/);
assert.match(detailMethod, /attachUploadedDocumentState/);
assert.match(repository, /reportRepository\.templateVersionSnapshots/);
assert.match(reportService, /mapReportRow\(row: any, detailLoaded = false\)/);
assert.match(reportService, /async get\(id: string\) \{\s*return mapReportRow\(await reportRepository\.get\(id\), true\)/);
assert.match(context, /report\.detailLoaded/);
assert.match(context, /requestId === reportViewRequest\.current/);
assert.match(context, /requestId === reportSendRequest\.current/);
assert.match(context, /requestId === reportSignRequest\.current/);
assert.match(monitor, /await loadReportDetail\(report\.id\)/);
assert.doesNotMatch(monitor, /reportService\.get\(|reportRepository\.get\(/);
assert.match(dashboard, /loadReportDetail=\{getReportDetail\}/);
assert.match(context, /const getReportDetail = \(reportId: string\): Promise<ReportInstance>/);
assert.match(context, /recoverOnceAndRetry\(\(\) => reportService\.get\(reportId\)\)/);
assert.match(reportsPage, /openFillReportModal\(tpl, rep\)/);
assert.match(context, /prepareReportForEditing\(/);
assert.match(context, /reportEditLoadingId/);
assert.match(context, /reportDetailFlights/);
assert.match(context, /getWorkspaceCollections\(/);
assert.match(repository, /readBatchedByIds\(assignmentIds/);
assert.match(monitor, /reportLoading \? \[/);

// Diagnostics contain counts/status codes only, never tokens or profile data.
assert.match(context, /\[WidgetFlow reports\].*code: err\?\.code, status: err\?\.status/);
assert.doesNotMatch(context, /console\.(?:warn|error)\([^\n]*(?:currentUser\.id|session\.access_token|authorization|jwt)/i);

console.log('Phase 109 auth/workspace performance static checks passed');
