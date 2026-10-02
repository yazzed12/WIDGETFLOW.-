import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const repository = read('src/features/delegations/delegationRepository.ts');
const context = read('src/context/AppContext.tsx');
const page = read('src/pages/DelegationsPage.tsx');
const navbar = read('src/components/layout/Navbar.tsx');
const sidebar = read('src/components/layout/Sidebar.tsx');
const approvals = read('src/pages/ApprovalsPage.tsx');
const drawer = read('src/components/approvals/ApprovalDetailDrawer.tsx');
const templateRepo = read('src/features/templates/repositories/templateRepository.ts');
const admin = read('src/components/admin/AdminDelegations.tsx');
const activity = read('src/pages/OrganizationActivityPage.tsx');
const comments = read('src/components/approvals/RequestCommentThread.tsx');
const reviewVisibility = read('src/features/templates/templateApprovalVisibility.ts');
const timelineRepo = read('src/features/templates/templateTimelineRepository.ts');
const workflowMonitor = read('src/components/dashboard/WorkflowMonitor.tsx');
const notificationPage = read('src/pages/NotificationsPage.tsx');
const templateAppContext = context;

assert.match(repository, /rpc\('list_delegation_candidates',\s*\{\s*p_search:[\s\S]*p_limit:[\s\S]*p_offset:/);
assert.match(repository, /rpc\('create_delegation',\s*\{\s*p_delegate_user_id:[\s\S]*p_start_at:[\s\S]*p_end_at:[\s\S]*p_reason:/);
assert.match(repository, /rpc\('select_delegation_context'/);
assert.match(repository, /rpc\('clear_delegation_context'/);
assert.match(repository, /rpc\('list_my_delegations'/);
assert.doesNotMatch(page, /\.delete\s*\(/i);
assert.doesNotMatch(page, /Accept Delegation|Reject Delegation|Pending Acceptance/i);
assert.match(page, /candidatePage\s*\*\s*DELEGATION_PAGE_SIZE/);
assert.match(page, /delegationService\.create\(selected\.userId/);
assert.match(page, /end <= start/);
assert.match(page, /reason\.length > 500/);
assert.match(page, /authorityContext\?\.mode === 'own'/);
assert.match(page, /Your authority:<\/span> \{authorityContext\?\.mode === 'own' \? authorityContext\.authority\.roleName/);

assert.match(context, /delegationService\.currentAuthorityContext\(\)/);
assert.match(context, /delegationService\.selectContext\(delegationId\)/);
assert.match(context, /delegationService\.clearContext\(\)/);
assert.match(context, /runExclusiveAction\(authorityTransitionLock/);
assert.equal((context.match(/runExclusiveAction\(authorityTransitionLock/g) ?? []).length, 2, 'select and clear share one exclusive transition lock');
assert.match(context, /authorityContextStatus !== 'ready'/);
assert.match(context, /refreshTemplates\(true\)/);
assert.match(templateAppContext, /rawCode === 'DELEGATION_CONTEXT_INVALID'/);
assert.match(templateAppContext, /rawCode === 'DELEGATION_NOT_ACTIVE_OR_NOT_ASSIGNED'/);
assert.match(templateAppContext, /Your delegated authority is no longer active\./);
assert.match(templateAppContext, /rawCode === 'FORBIDDEN'/);
assert.match(sidebar, /id: 'delegations'/);
assert.match(navbar, /setActiveView\('delegations'\)/);
assert.match(navbar, /currentUser\.name/);
assert.match(navbar, /Acting as \{authorityContext\.authority\.roleName\}/);
assert.match(navbar, /Return to My Role/);
assert.doesNotMatch(navbar, /hidden max-w-\[18rem\].*lg:flex/);

assert.doesNotMatch(approvals, /requestedApprovalFromUserId\s*===\s*currentUser\.id/);
assert.doesNotMatch(drawer, /requestedApprovalFromUserId\s*===\s*currentUser\.id/);
assert.match(reviewVisibility, /RLS-filtered/);
assert.doesNotMatch(reviewVisibility, /requestedApprovalFromUserId|routing_specific_user_id|target_role_id/);
for (const rpcName of ['claim_template_review', 'approve_template', 'reject_template', 'return_template_for_revision', 'add_template_comment']) {
  assert.ok(templateRepo.includes(rpcName), `existing RPC ${rpcName} remains in use`);
}
assert.match(approvals, /hasTemplateApprovalPermission\('template_approvals\.reject'\) && \(/);
assert.doesNotMatch(approvals, /template_approvals\.reject'\) && hasTemplateApprovalPermission\('template_approvals\.approve'\) && \(/);
assert.match(drawer, /template_approvals\.reject'\) && <button[\s\S]*Return for Revision/);
assert.match(templateRepo, /approvalRpcResult/);
assert.match(templateRepo, /new AppError\('FORBIDDEN', "You don't have permission to perform this action\."\)/);
assert.doesNotMatch(templateRepo, /async (?:claimReview|approve|reject|returnForRevision|addComment)[\s\S]{0,220}throw new Error\(error\.message\)/);

assert.match(admin, /delegationService\.listAdmin\(scope, search, page \* DELEGATION_PAGE_SIZE\)/);
assert.match(admin, /delegationService\.adminCancel\(target\.id, reason\.trim\(\)\)/);
assert.match(admin, /required maxLength=\{500\}/);
assert.doesNotMatch(admin, /Create Delegation|createOnBehalf/i);
assert.match(activity, /Acting as \{event\.authorityRoleName \|\| event\.actorRoleName\} for \{event\.delegatedByName\}/);
assert.match(comments, /delegatedByName/);
assert.match(timelineRepo, /delegated_by_name/);
assert.match(workflowMonitor, /Acting as \{step\.authorityRoleName \|\| 'delegated authority'\} for \{step\.delegatedByName\}/);
assert.match(notificationPage, /template_review_requested_delegated/);
console.log('delegation frontend static checks passed');
