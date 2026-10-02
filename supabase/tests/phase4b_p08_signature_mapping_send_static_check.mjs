import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql = fs.readFileSync(
  new URL('../migrations/089_unified_signature_definition_and_report_customization.sql', import.meta.url),
  'utf8',
);

const start = sql.search(/create\s+or\s+replace\s+function\s+public\.send_report\s*\(/i);
assert.notEqual(start, -1, 'migration 089 must define the current public send_report contract');
const open = sql.indexOf('$function$', start);
const close = sql.indexOf('$function$', open + '$function$'.length);
assert.notEqual(close, -1, 'send_report body must terminate');
const send = sql.slice(start, close + '$function$'.length);

assert.match(sql, /088_optional_signature_customization_semantics/);
assert.match(send, /p_signature_mappings\s+jsonb\s+default\s+'\[\]'::jsonb/i);
assert.match(send, /report_effective_signature_definitions/);
assert.match(send, /jsonb_typeof\(p_signature_mappings\)\s*<>\s*'array'/);
assert.match(send, /SIGNATURE_MAPPING_INVALID_FORMAT/);
assert.match(send, /recipientUserId/);
assert.match(send, /signatureFieldKey/);
assert.match(send, /SIGNATURE_MAPPING_RECIPIENT_INVALID/);
assert.match(send, /SIGNATURE_MAPPING_RECIPIENT_DUPLICATE/);
assert.match(send, /SIGNATURE_MAPPING_FIELD_DUPLICATE/);
assert.match(send, /SIGNATURE_MAPPING_FIELD_NOT_FOUND/);
assert.match(send, /signature_role\s*<>\s*'receiver'/);
assert.match(send, /SIGNATURE_MAPPING_FIELD_NOT_RECEIVER/);
assert.match(send, /required_role_key/);
assert.match(send, /signature_user_has_required_role/);
assert.match(send, /SIGNATURE_REQUIRED_ROLE_MISMATCH/);
assert.match(send, /SIGNATURE_MAPPING_FIELD_REQUIRED/);
assert.match(send, /insert\s+into\s+public\.report_signature_assignments/i);
assert.match(send, /definition\.signature_field_key/);
assert.match(send, /definition\.display_label/);
assert.match(send, /report_send_cycles/);
assert.match(send, /report_assignments/);
assert.match(send, /REPORT_RECEIVED/);
assert.match(send, /report_audit/);
assert.match(send, /security\s+definer/i);
assert.match(send, /set\s+search_path\s*=\s*''/i);
assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.send_report\(uuid,uuid\[\],text,jsonb\)\s+from\s+public,\s*anon/i);
assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.send_report\(uuid,uuid\[\],text,jsonb\)\s+to\s+authenticated/i);
assert.doesNotMatch(send, /send_report_038_legacy/);

console.log('phase4b_p08_signature_mapping_send_static_check: PASS (canonical migration 089)');
