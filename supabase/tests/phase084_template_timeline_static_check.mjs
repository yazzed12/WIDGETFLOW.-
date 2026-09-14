import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync(new URL('../migrations/084_template_timeline_read.sql', import.meta.url), 'utf8');
const verifier = fs.readFileSync(new URL('../migrations/084_verify_template_timeline_read.sql', import.meta.url), 'utf8');
const repository = fs.readFileSync(new URL('../../src/features/templates/templateTimelineRepository.ts', import.meta.url), 'utf8');
const monitor = fs.readFileSync(new URL('../../src/components/dashboard/WorkflowMonitor.tsx', import.meta.url), 'utf8');

assert.match(migration, /get_template_timeline\(p_template_id uuid\)/);
assert.match(migration, /security definer/i);
assert.match(migration, /set search_path = ''/i);
assert.match(migration, /left\(id, 4\) = '083_'/i);
assert.match(migration, /template_audit_events/);
assert.match(migration, /TEMPLATE_RETURNED/);
assert.match(migration, /Resubmitted for approval/);
assert.doesNotMatch(migration, /select[\s\S]*event_data/i);
assert.match(verifier, /get_template_timeline\(uuid\)/);
assert.match(repository, /rpc\('get_template_timeline'/);
assert.match(monitor, /templateService\.getTimeline/);
assert.match(monitor, /Review template/);
assert.match(monitor, /Edit template/);
assert.match(monitor, /Pending ID/);

console.log('template timeline static checks passed');
