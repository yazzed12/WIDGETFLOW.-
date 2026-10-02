import assert from 'node:assert/strict';
import fs from 'node:fs';

const dashboard = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
const quickActions = fs.readFileSync('src/components/dashboard/QuickActions.tsx', 'utf8');
const authority = fs.readFileSync('src/features/delegations/effectiveAuthority.ts', 'utf8');
const actionModel = fs.readFileSync('src/components/dashboard/quickActionModel.ts', 'utf8');

for (const title of ['Create New Template', 'Create Report', 'My Requests', 'Approvals']) {
  assert.match(actionModel, new RegExp(`title: '${title}'`));
}
assert.match(actionModel, /canAuthorTemplate\(input\.hasOperationalPermission\)/);
assert.match(dashboard, /canCreateTemplateBackedReport\(hasOperationalPermission\)/);
assert.match(authority, /hasPermission\('reports\.view_own'\)/);
assert.match(actionModel, /hasTemplateApprovalPermission\('template_approvals\.view'\)/);
assert.match(dashboard, /setActiveView\('templates'\)/);
assert.match(dashboard, /setActiveView\('my-requests'\)/);
assert.match(dashboard, /setActiveView\('approvals'\)/);
assert.match(quickActions, /<button[\s\S]*type="button"/);
assert.match(quickActions, /focus-visible:ring-2/);
assert.match(quickActions, /aria-labelledby="dashboard-quick-actions"/);

console.log('Dashboard Quick Actions static checks passed');
