import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync(new URL('../migrations/080_report_display_id.sql', import.meta.url), 'utf8');
const reportService = fs.readFileSync(new URL('../../src/features/reports/reportService.ts', import.meta.url), 'utf8');
const monitor = fs.readFileSync(new URL('../../src/components/dashboard/WorkflowMonitor.tsx', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('../../src/pages/DashboardPage.tsx', import.meta.url), 'utf8');

assert.match(migration, /next_report_display_id/);
assert.match(migration, /on conflict \(year_key\)/);
assert.match(migration, /RPT-.*lpad\(v_seq::text, 6/);
assert.match(migration, /reports_assign_display_id/);
assert.match(migration, /report_display_id.*unique/i);
assert.doesNotMatch(migration, /recipient/);
assert.match(reportService, /report_display_id/);
assert.match(monitor, /displayId/);
assert.match(monitor, /activityService/);
assert.match(monitor, /auditHistory/);
assert.match(dashboard, /WorkflowMonitor/);
console.log('report display and workflow monitor static checks passed');
