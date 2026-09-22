import fs from 'node:fs';
import assert from 'node:assert/strict';

const fill = fs.readFileSync(new URL('../../src/components/reports/FillReportModal.tsx', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../migrations/088_optional_signature_customization_semantics.sql', import.meta.url), 'utf8');
const verifier = fs.readFileSync(new URL('../migrations/088_optional_signature_customization_semantics_verify.sql', import.meta.url), 'utf8');

assert.match(fill, /some\(\(configuration\) => configuration\.isOverride\)/, 'customization must initialize only from persisted overrides');
assert.match(fill, /const requiresRoleDirectory = signatureCustomizationEnabled;/, 'role directory must be lazy while customization is off');
assert.match(fill, /if \(!signatureCustomizationEnabled\) \{[\s\S]*?return true;/, 'off mode must bypass creator-required validation');
assert.match(fill, /!signatureCustomizationEnabled\s*\?\s*field\.defaultRequiredRoleKey/, 'off mode must use template defaults');
assert.match(fill, /signatureCustomizationEnabled && creatorRequiredMissing\.length > 0/, 'creator-required warning must be customization-only');
assert.doesNotMatch(fill, /setSignatureCustomizationEnabled\(true\);\s*showToast\('Please complete/, 'validation must not auto-enable customization');

assert.match(migration, /087_signature_role_directory_and_effective_role_hardening/);
assert.match(migration, /private\.complete_report_085_legacy/);
assert.doesNotMatch(migration, /SIGNATURE_CONFIGURATION_REQUIRED/);
assert.doesNotMatch(migration, /report_creator_required/);
assert.match(verifier, /no_creator_configuration_gate/);
assert.match(verifier, /effective_configuration_helper_exists/);
assert.match(verifier, /signature_configuration_table_intact/);

console.log('signature_optional_customization_static_check: PASS');
