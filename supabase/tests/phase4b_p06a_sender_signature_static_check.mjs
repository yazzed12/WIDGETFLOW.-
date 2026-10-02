import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql = fs.readFileSync(
  new URL('../migrations/089_unified_signature_definition_and_report_customization.sql', import.meta.url),
  'utf8',
);

function functionSource(schema, name) {
  const start = sql.search(new RegExp(`create\\s+or\\s+replace\\s+function\\s+${schema}\\.${name}\\s*\\(`, 'i'));
  assert.notEqual(start, -1, `${schema}.${name} must be defined by migration 089`);
  const open = sql.indexOf('$function$', start);
  const close = sql.indexOf('$function$', open + '$function$'.length);
  assert.notEqual(close, -1, `${schema}.${name} body must terminate`);
  return sql.slice(start, close + '$function$'.length);
}

const definitions = functionSource('private', 'report_effective_signature_definitions');
const senderRoles = functionSource('private', 'validate_sender_signature_roles');
const send = functionSource('public', 'send_report');

assert.match(sql, /088_optional_signature_customization_semantics/);
assert.match(definitions, /schema_snapshot/);
assert.match(definitions, /field_key/);
assert.match(definitions, /report_signature_configurations/);
assert.match(definitions, /display_label_override/);
assert.match(definitions, /signature_role/);
assert.match(definitions, /required_role_key/);
assert.match(senderRoles, /report_effective_signature_definitions/);
assert.match(senderRoles, /signature_role\s*=\s*'sender'/);
assert.match(senderRoles, /signature_user_has_required_role/);
assert.match(send, /validate_sender_signature_roles/);
assert.match(send, /signature_role\s*=\s*'sender'/);
assert.match(send, /signature_profiles/);
assert.match(send, /user_id\s*=\s*actor\.user_id/);
assert.match(send, /is_active/);
assert.match(send, /SENDER_SIGNATURE_REQUIRED/);
assert.match(send, /signature_method/);
assert.match(send, /typed_name/);
assert.match(send, /drawing_data/);
assert.match(send, /signature_asset_id/);
assert.match(send, /definition\.signature_field_key/);
assert.match(send, /definition\.display_label/);
assert.match(send, /field_type_snapshot/);
assert.match(send, /'signature'/);

console.log('phase4b_p06a_sender_signature_static_check: PASS (canonical migration 089)');
