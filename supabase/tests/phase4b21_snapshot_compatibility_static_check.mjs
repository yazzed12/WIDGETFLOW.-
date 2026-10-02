import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url).pathname;
const sql = fs.readFileSync(
  `${root}supabase/migrations/031_report_snapshot_shape_compatibility.sql`,
  'utf8',
);
const verify = fs.readFileSync(
  `${root}supabase/migrations/031_verify_report_snapshot_shape_compatibility.sql`,
  'utf8',
);
const repo = fs.readFileSync(
  `${root}src/features/reports/reportRepository.ts`,
  'utf8',
);

assert.match(sql, /030_report_core_lifecycle_hardening/);
assert.match(sql, /field_key/);
// Assert the JSON text-extraction operator and key, allowing formatting whitespace.
assert.match(sql, /f\s*->>\s*'key'/);
assert.match(sql, /field_type/);
assert.match(sql, /f\s*->>\s*'type'/);
assert.match(sql, /is_required/);
assert.match(sql, /f\s*->>\s*'required'/);
assert.match(sql, /default_value/);
assert.match(sql, /defaultValue/);
assert.match(sql, /TEMPLATE_VERSION_DUPLICATE_FIELD_KEY/);
assert.match(sql, /UNKNOWN_REPORT_FIELD/);
assert.match(sql, /safe_template_field_id/);
assert.ok(sql.includes('rid ~*'), 'UUID validation must use a case-insensitive regex');
assert.ok(sql.includes('^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}'));
assert.match(sql, /jsonb_array_length/);
assert.match(sql, /val\s*=\s*'\{\}'::jsonb/);
assert.doesNotMatch(sql, /update\s+public\.template_versions/i);
assert.doesNotMatch(sql, /report_send_cycles\s*\(/);
assert.doesNotMatch(repo, /apiService/);
assert.match(verify, /031_report_snapshot_shape_compatibility/);
assert.doesNotMatch(
  verify.replace(/--.*$/gm, ''),
  /^\s*(insert|update|delete|alter|create|drop|grant|revoke)\b/im,
);

console.log('phase4b2.1 snapshot compatibility static checks passed');
