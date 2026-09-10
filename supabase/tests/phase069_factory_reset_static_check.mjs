import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync(new URL('../migrations/066_factory_reset_execution_engine.sql', import.meta.url), 'utf8');
assert.match(migration, /admin_execute_factory_reset/);
assert.match(migration, /RESET WIDGETFLOW DATA/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /current_user_is_protected_admin/);
assert.match(migration, /current_send_cycle_id = null/);
assert.match(migration, /supersedes_event_id = null/);
assert.match(migration, /supersedes_template_id = null/);
assert.doesNotMatch(migration, /storage\./i);
assert.doesNotMatch(migration, /auth\.users.*delete/i);
console.log('phase069 factory reset static checks passed');
