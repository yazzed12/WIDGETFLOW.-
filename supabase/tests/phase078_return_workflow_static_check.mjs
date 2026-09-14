import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/078_template_return_and_report_return_schema_fix.sql');
const repo = read('src/features/templates/repositories/templateRepository.ts');
const service = read('src/features/templates/services/templateService.ts');
const context = read('src/context/AppContext.tsx');
const approvals = read('src/pages/ApprovalsPage.tsx');
const drawer = read('src/components/approvals/ApprovalDetailDrawer.tsx');
const requestDrawer = read('src/components/requests/RequestDetailDrawer.tsx');
const myRequests = read('src/pages/MyRequestsPage.tsx');
const builder = read('src/components/template-builder/TemplateBuilder.tsx');
const serializer = read('src/features/templates/mappers/templateSerializer.ts');
const types = read('src/types/index.ts');
const reportService = read('src/features/reports/reportService.ts');
const errors = read('src/lib/errors/errorHandling.ts');

const reportReturn = migration.slice(migration.indexOf('create or replace function public.return_report'), migration.indexOf('-- Reviewer action distinct'));
const templateReturn = migration.slice(migration.indexOf('create or replace function public.return_template_for_revision'));

const checks = [
  ['migration depends on report/template foundations', migration.includes('057_signature_capacity_read_only_recipients') && migration.includes('059_template_dynamic_pending_reviewer_eligibility')],
  ['template return metadata columns', migration.includes('add column if not exists returned_at') && migration.includes('add column if not exists return_reason')],
  ['report return has no assignment updated_at writes', !Array.from(reportReturn.matchAll(/update public\.report_assignments[\s\S]*?;/g)).some(([statement]) => statement.includes('updated_at'))],
  ['report return preserves signer-only guard', reportReturn.includes('SIGNATURE_ASSIGNMENT_REQUIRED')],
  ['report return requires a reason', reportReturn.includes("nullif(btrim(p_reason), '') is null") && reportReturn.includes('RETURN_REASON_REQUIRED')],
  ['report return preserves ownership and lifecycle guards', reportReturn.includes('SELF_RECIPIENT_ACTION_NOT_ALLOWED') && reportReturn.includes('ASSIGNMENT_NOT_OWNED') && reportReturn.includes("r.status <> 'sent'") && reportReturn.includes("x.assignment_status <> 'pending'")],
  ['report return preserves lifecycle transitions', reportReturn.includes("assignment_status = 'returned'") && reportReturn.includes("assignment_status = 'cancelled'") && reportReturn.includes("status = 'returned'") && reportReturn.includes("status = 'draft'")],
  ['report return preserves notification and audit', reportReturn.includes("'REPORT_RETURNED'") && reportReturn.includes('report_audit_events')],
  ['template return uses draft status', templateReturn.includes("set status = 'draft'")],
  ['template return requires reason', templateReturn.includes('RETURN_REASON_REQUIRED')],
  ['template return requires pending review and rejects self-review', templateReturn.includes("t.status <> 'pending_approval'") && templateReturn.includes('current_user_can_review_template')],
  ['template return uses existing reviewer permissions', templateReturn.includes("template_approvals.view") && templateReturn.includes("template_approvals.reject")],
  ['template return reuses reviewer eligibility helper', templateReturn.includes('current_user_can_review_template')],
  ['template return clears reviewer materialization', templateReturn.includes('assigned_reviewer_user_id = null') && templateReturn.includes('claimed_at = null')],
  ['template return writes distinct audit event', templateReturn.includes("'TEMPLATE_RETURNED'")],
  ['template return RPC wired', repo.includes("return_template_for_revision") && service.includes('returnForRevision')],
  ['return action exposed in approval inbox', approvals.includes('ReturnTemplateModal') && approvals.includes('returnTemplateForRevision')],
  ['unclaimed role queue remains actionable', approvals.includes('canReviewThisTemplate') && approvals.includes('isUnclaimedQueueItem') && approvals.includes('!req.requestedApprovalFromUserId') && approvals.includes('returnTargetTemplate')],
  ['return action exposed in approval drawer', drawer.includes('ReturnTemplateModal') && drawer.includes('returnTemplateForRevision')],
  ['return action follows assigned or unclaimed pending eligibility', drawer.includes('canReviewTemplate') && drawer.includes('!template.requestedApprovalFromUserId') && drawer.includes("template_approvals.reject")],
  ['returned metadata mapped', serializer.includes('returnReason') && serializer.includes('returnedAt') && types.includes('returnReason?: string')],
  ['returned report metadata mapped', reportService.includes('returnReason: row.return_reason') && reportService.includes('returnedAt: row.returned_at')],
  ['safe return reason normalization', errors.includes('RETURN_REASON_REQUIRED')],
  ['context refreshes after template return', context.includes('templateService.returnForRevision') && context.includes('await refreshTemplates()')],
  ['template refresh preserves returned draft marker until resubmit', context.includes('prior.returnedAt') && context.includes("template.status === 'Draft'")],
  ['returned reason shown in creator requests', myRequests.includes('req.returnedAt') && myRequests.includes('req.returnReason')],
  ['returned drafts use edit flow instead of partial direct submit', myRequests.includes('!req.returnedAt') && requestDrawer.includes('!template.returnedAt')],
  ['editor preserves return context on draft save', builder.includes('returnContext') && builder.includes('...returnContext')],
  ['editor shows return context', builder.includes('Returned for Revision') && builder.includes('templateState.returnReason')],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`Phase 078 return workflow static check passed (${checks.length} checks)`);
