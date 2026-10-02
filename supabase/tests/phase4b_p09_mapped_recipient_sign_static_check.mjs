import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql = fs.readFileSync(
  new URL('../migrations/089_unified_signature_definition_and_report_customization.sql', import.meta.url),
  'utf8',
);

const start = sql.search(/create\s+or\s+replace\s+function\s+public\.sign_report\s*\(/i);
assert.notEqual(start, -1, 'migration 089 must define the current public sign_report contract');
const open = sql.indexOf('$function$', start);
const close = sql.indexOf('$function$', open + '$function$'.length);
assert.notEqual(close, -1, 'sign_report body must terminate');
const sign = sql.slice(start, close + '$function$'.length);

assert.match(sql, /088_optional_signature_customization_semantics/);
assert.match(sign, /report_effective_signature_definitions/);
assert.match(sign, /current_user_is_active/);
assert.match(sign, /SELF_SIGN_NOT_ALLOWED/);
assert.match(sign, /report_row\.status\s*<>\s*'sent'/);
assert.match(sign, /current_send_cycle_id/);
assert.match(sign, /assignment_row\.recipient_user_id\s*<>\s*actor\.user_id/);
assert.match(sign, /ASSIGNMENT_NOT_OWNED/);
assert.match(sign, /assignment_status\s*<>\s*'pending'/);
assert.match(sign, /SEND_CYCLE_NOT_CURRENT/);
assert.match(sign, /cycle_row\.status\s*<>\s*'active'/);
assert.match(sign, /SEND_CYCLE_CONTENT_HASH_MISSING/);
assert.match(sign, /report_signature_assignments/);
assert.match(sign, /recipient_user_id\s*=\s*actor\.user_id/);
assert.match(sign, /signature_role\s*<>\s*'receiver'/);
assert.match(sign, /SIGNATURE_MAPPING_INVALID/);
assert.match(sign, /required_role_key/);
assert.match(sign, /signature_user_has_required_role/);
assert.match(sign, /SIGNATURE_REQUIRED_ROLE_MISMATCH/);
assert.match(sign, /signature_profiles/);
assert.match(sign, /is_active/);
assert.match(sign, /RECIPIENT_SIGNATURE_REQUIRED/);
assert.match(sign, /signed_content_hash/);
assert.match(sign, /cycle_row\.content_hash/);
assert.match(sign, /report_signature_events/);
assert.match(sign, /assignment_status\s*=\s*'signed'/);
assert.match(sign, /REPORT_SIGNED/);
assert.match(sign, /total_mapped\s*>\s*0\s+and\s+signed_mapped\s*=\s*total_mapped/);
assert.match(sign, /status\s*=\s*'finalized'/);
assert.match(sign, /status\s*=\s*'signed'/);
assert.match(sign, /locked_at\s*=\s*statement_timestamp\(\)/);
assert.match(sign, /REPORT_FULLY_SIGNED/);
assert.match(sign, /security\s+definer/i);
assert.match(sign, /set\s+search_path\s*=\s*''/i);
assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.sign_report\(uuid,uuid,jsonb\)\s+from\s+public,\s*anon/i);
assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.sign_report\(uuid,uuid,jsonb\)\s+to\s+authenticated/i);

console.log('phase4b_p09_mapped_recipient_sign_static_check: PASS (canonical migration 089)');
