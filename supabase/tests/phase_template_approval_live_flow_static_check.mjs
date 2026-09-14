import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const app = read('src/context/AppContext.tsx');
const repo = read('src/features/templates/repositories/templateRepository.ts');
const submitRpc = read('supabase/migrations/023_template_domain_operations.sql');
const reviewer = read('supabase/migrations/059_template_dynamic_pending_reviewer_eligibility.sql');

const checks = [
  ['submit uses saved template UUID', app.includes('templateService.submit(savedTemplate.id)')],
  ['submit refreshes template collections', app.includes('const result = await templateService.submit(savedTemplate.id);') && app.includes('await refreshTemplates();')],
  ['approval inbox refreshes on entry', app.includes("activeView === 'approvals'") && app.includes("activeView === 'my-requests'") && app.includes('void refreshTemplates();')],
  ['pending query uses canonical status', repo.includes(".eq('status', 'pending_approval')")],
  ['role queue writes pending status', submitRpc.includes("assignment_strategy='ROLE_QUEUE'") && submitRpc.includes("status='pending_approval'")],
  ['role queue preserves configured target role', submitRpc.includes('target_role_id=r.target_role_id')],
  ['role queue clears assigned reviewer', submitRpc.includes('assigned_reviewer_user_id=null')],
  ['role queue records submission timestamp', submitRpc.includes('submitted_at=statement_timestamp()')],
  ['reviewer helper requires active profile', reviewer.includes("p.status = 'Active'")],
  ['reviewer helper requires approval permissions', reviewer.includes("template_approvals.view") && reviewer.includes("template_approvals.approve")],
  ['reviewer helper excludes self review', reviewer.includes('route.created_by_user_id <> a.id')],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);
console.log(`Template approval live-flow static check passed (${checks.length} checks)`);
