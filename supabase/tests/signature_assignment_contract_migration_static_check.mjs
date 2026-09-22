import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync(new URL('../migrations/086_authoritative_signature_assignment_contract.sql', import.meta.url), 'utf8');
const verifier = fs.readFileSync(new URL('../migrations/086_authoritative_signature_assignment_contract_verify.sql', import.meta.url), 'utf8');

assert.match(migration, /085_template_workflow_notifications/);
assert.match(migration, /086_authoritative_signature_assignment_contract/);
assert.match(migration, /create table public\.report_signature_configurations/);
assert.doesNotMatch(migration, /insert into public\.report_values[\s\S]*signature_role/);
assert.match(migration, /report_id uuid not null/);
assert.match(migration, /signature_field_key text not null/);
assert.match(migration, /required_role_key text/);
assert.match(migration, /assignment_policy text not null/);
assert.match(migration, /enable row level security/);
assert.match(migration, /grant select on table public\.report_signature_configurations to authenticated/);
assert.match(migration, /report_effective_signature_configuration/);
assert.match(migration, /template_versions/);
assert.match(migration, /set_report_signature_configuration/);
assert.match(migration, /reset_report_signature_configuration/);
assert.match(migration, /SIGNATURE_CONFIGURATION_FIXED/);
assert.match(migration, /SIGNATURE_CONFIGURATION_REQUIRED/);
assert.match(migration, /SIGNATURE_REQUIRED_ROLE_MISMATCH/);
assert.match(migration, /validate_sender_signature_roles/);
assert.match(migration, /private\.complete_report_085_legacy/);
assert.match(migration, /private\.send_report_085_legacy/);
assert.match(migration, /private\.sign_report_085_legacy/);
assert.match(migration, /component_key = latest\.signature_field_key/);
assert.match(migration, /auth\.uid\(\)/);
assert.match(verifier, /configuration_rls_enabled/);
assert.match(verifier, /authenticated_insert/);
assert.match(verifier, /creator_required_enforced/);
assert.match(verifier, /required_role_enforced/);
assert.match(verifier, /component_key_persisted/);

console.log('signature_assignment_contract_migration_static_check: PASS');
