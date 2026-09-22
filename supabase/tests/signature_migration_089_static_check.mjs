import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync(new URL('../migrations/089_unified_signature_definition_and_report_customization.sql', import.meta.url), 'utf8');
const verifier = fs.readFileSync(new URL('../migrations/089_unified_signature_definition_and_report_customization_verify.sql', import.meta.url), 'utf8');

assert.match(migration, /private\.report_effective_signature_definitions/);
assert.match(migration, /display_label_override/);
assert.match(migration, /signature_field_key/);
assert.match(migration, /private\.validate_sender_signature_roles/);
assert.match(migration, /from private\.report_effective_signature_definitions\(p_report_id\)/);
assert.match(migration, /create or replace function public\.send_report[\s\S]*?report_effective_signature_definitions/s);
assert.match(migration, /create or replace function public\.sign_report[\s\S]*?report_effective_signature_definitions/s);
assert.match(migration, /definition\.display_label/);
assert.match(migration, /p_signature_role text[\s\S]*p_display_label text/);
assert.doesNotMatch(migration, /component_id/);
assert.match(verifier, /effective_definition_helper_exists/);
assert.match(verifier, /sender_uses_effective_context_only/);
assert.match(verifier, /send_uses_effective_receiver_context/);
assert.match(verifier, /sign_uses_effective_receiver_context/);

const send089 = migration.slice(migration.lastIndexOf('create or replace function public.send_report'));
const sign089 = migration.slice(migration.lastIndexOf('create or replace function public.sign_report'));
assert.doesNotMatch(send089, /jsonb_each\(/, '089 send must not rediscover receiver meaning from raw JSON');
assert.doesNotMatch(sign089, /jsonb_each\(/, '089 sign must not rediscover receiver meaning from raw JSON');
console.log('signature_migration_089_static_check: PASS');
