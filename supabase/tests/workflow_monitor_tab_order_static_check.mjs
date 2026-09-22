import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../../src/components/dashboard/WorkflowMonitor.tsx', import.meta.url), 'utf8');
const match = source.match(/\(\['reports',\s*'approvals',\s*'activity'\]\s+as\s+Tab\[\]\)/);
assert.ok(match, 'Workflow Monitor tabs must be ordered Reports, Approvals, Activity');
assert.match(source, /useState<Tab>\('reports'\)/, 'Reports should be the default workflow monitor tab');
assert.match(source, /tab === 'reports'/, 'Reports tab content must remain wired');
assert.match(source, /tab === 'approvals'/, 'Approvals tab content must remain wired');
assert.match(source, /tab === 'activity'/, 'Activity tab content must remain wired');

console.log('workflow monitor tab order static check passed');
