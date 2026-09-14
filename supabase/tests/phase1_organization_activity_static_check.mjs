import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync(new URL('../migrations/079_organization_activity_feed.sql', import.meta.url), 'utf8');
const verify = fs.readFileSync(new URL('../migrations/079_verify_organization_activity_feed.sql', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../../src/pages/OrganizationActivityPage.tsx', import.meta.url), 'utf8');
const repo = fs.readFileSync(new URL('../../src/features/activity/activityRepository.ts', import.meta.url), 'utf8');

assert.match(migration, /list_organization_activity/);
assert.match(migration, /audit_history\.view/);
assert.match(migration, /current_user_can_read_report/);
assert.match(migration, /template_audit_events/);
assert.match(migration, /report_signature_events/);
assert.match(migration, /limit least\(greatest/);
assert.doesNotMatch(migration, /event_data\s*,/);
assert.doesNotMatch(migration, /application_auth_events/);
assert.match(verify, /authenticated_can_execute/);
assert.match(page, /Load more/);
assert.match(page, /Organization Activity/);
assert.match(repo, /list_organization_activity/);
console.log('phase1 organization activity static checks passed');
