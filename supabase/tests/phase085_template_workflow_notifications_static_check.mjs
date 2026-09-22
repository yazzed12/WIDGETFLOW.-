import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/085_template_workflow_notifications.sql');
const notificationsPage = read('src/pages/NotificationsPage.tsx');
const types = read('src/types/index.ts');

const checks = [
  ['migration guard requires 084', migration.includes("id = '084_template_timeline_read'")],
  ['migration records 085', migration.includes("'085_template_workflow_notifications'")],
  ['private helper is security definer', /create or replace function private\.create_template_notification[\s\S]*?security definer/.test(migration)],
  ['private helper hardens search path', /create or replace function private\.create_template_notification[\s\S]*?set search_path = ''/.test(migration)],
  ['private helper rejects self notifications', /p_recipient_user_id = auth\.uid\(\)/.test(migration)],
  ['private helper inserts explicit recipient and template relation', /recipient_user_id[\s\S]*?related_template_id/.test(migration)],
  ['submission producer uses review-requested type', migration.includes("'TEMPLATE_REVIEW_REQUESTED'")],
  ['submission role queue uses active role permissions', migration.includes("ro.is_active") && migration.includes("template_approvals.view") && migration.includes("template_approvals.approve")],
  ['submission excludes creator', migration.includes('p.id <> a.user_id')],
  ['specific-user routing is preserved', migration.includes("r.strategy = 'SPECIFIC_USER'") && migration.includes('r.specific_user_id')],
  ['approval keeps display id generation', migration.includes('next_template_display_id') && migration.includes('template_display_id')],
  ['approval keeps publication and audit', migration.includes('template_versions') && migration.includes("'TEMPLATE_APPROVED'")],
  ['approval producer exists', migration.includes("'TEMPLATE_APPROVED'") && migration.includes('create_template_notification')],
  ['rejection producer keeps reason', migration.includes("'TEMPLATE_REJECTED'") && migration.includes('rejection_reason')],
  ['return producer keeps return metadata', migration.includes("'TEMPLATE_RETURNED'") && migration.includes('returned_at') && migration.includes('return_reason')],
  ['claim function is not replaced', !migration.includes('create or replace function public.claim_template_review')],
  ['claim has no notification call', !/claim_template_review[\s\S]*?create_template_notification/.test(migration)],
  ['no trigger/event-bus producer added', !migration.toLowerCase().includes('create trigger') && !migration.toLowerCase().includes('event bus')],
  ['frontend type includes review request', types.includes('template_review_requested')],
  ['frontend type includes returned template', types.includes('template_returned')],
  ['review request navigates to approvals', /notif\.type === 'approval_required' \|\| notif\.type === 'template_review_requested'/.test(notificationsPage)],
  ['template family filter remains generic', notificationsPage.includes("type.includes('template')")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);
console.log(`Phase 085 template workflow notification static check passed (${checks.length} checks)`);
