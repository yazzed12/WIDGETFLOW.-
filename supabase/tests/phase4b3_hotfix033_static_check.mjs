import fs from 'node:fs'; import assert from 'node:assert/strict';
const root = new URL('../../', import.meta.url).pathname;
const sql = fs.readFileSync(`${root}supabase/migrations/033_report_send_runtime_hotfix.sql`,'utf8');
const oldSql = fs.readFileSync(`${root}supabase/migrations/032_report_multi_recipient_send.sql`,'utf8');
const fill = fs.readFileSync(`${root}src/components/reports/FillReportModal.tsx`,'utf8');
const modal = fs.readFileSync(`${root}src/components/reports/SendReportModal.tsx`,'utf8');
const repo = fs.readFileSync(`${root}src/features/reports/reportRepository.ts`,'utf8');
const requestErrors = fs.readFileSync(`${root}src/lib/errors/supabaseRequestError.ts`,'utf8');
assert.match(sql,/032_report_multi_recipient_send/); assert.match(sql,/create or replace function public\.send_report/); assert.match(sql,/actor record/); assert.match(sql,/assignment_row/); assert.match(sql,/for update/); assert.match(sql,/reports\.view_own/); assert.match(sql,/reports\.send/); assert.match(sql,/status<>'completed'/); assert.match(sql,/DUPLICATE_RECIPIENT/); assert.match(sql,/SELF_RECIPIENT_NOT_ALLOWED/); assert.match(sql,/INVALID_RECIPIENT/); assert.match(sql,/REPORT_SENT/); assert.match(sql,/REPORT_RECEIVED/); assert.doesNotMatch(sql,/select a\.id/); assert.equal(oldSql,fs.readFileSync(`${root}supabase/migrations/032_report_multi_recipient_send.sql`,'utf8'));
assert.match(fill,/updateReportInstance\([^\n]+true/); assert.match(modal,/sendReport\(report\.id, selectedRecipientIds/);
// The report repository now wraps Supabase errors before exposing transport metadata.
// Keep verifying the wrapped code/status contract without requiring raw error fields in the repository or logs.
assert.match(repo,/supabaseRequestError\(error, status/); assert.match(repo,/code: wrapped\.code, status: wrapped\.status/);
assert.match(requestErrors,/error\.code = typeof source\.code/); assert.match(requestErrors,/error\.details = typeof source\.details/);
assert.doesNotMatch(repo,/console\.warn\([^\n]*(?:error\.message|error\.details|error\.hint)/);
assert.doesNotMatch(fill,/apiService\.(createReport|updateReport|markReportCompleted)/);
console.log('phase4b3 hotfix 033 static checks passed');
