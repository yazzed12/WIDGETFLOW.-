import fs from 'node:fs';
import assert from 'node:assert/strict';

const fill = fs.readFileSync(new URL('../../src/components/reports/FillReportModal.tsx', import.meta.url), 'utf8');
const renderer = fs.readFileSync(new URL('../../src/components/dynamic-template/SignatureRenderer.tsx', import.meta.url), 'utf8');
const send = fs.readFileSync(new URL('../../src/components/reports/SendReportModal.tsx', import.meta.url), 'utf8');

assert.match(fill, /signatureCustomizationEnabled/);
assert.match(fill, /Customize signature settings for this report/);
assert.match(fill, /Using template signature settings/);
assert.match(fill, /role="switch"/);
assert.match(fill, /aria-checked=\{signatureCustomizationEnabled\}/);
assert.doesNotMatch(fill, /<input type="checkbox"[^>]*signatureCustomizationEnabled/);
assert.match(fill, /requiresRoleDirectory/);
assert.match(fill, /resetSignatureConfiguration/);
assert.match(fill, /Use template signature settings\?/i);
assert.match(fill, /report_creator_required/);
assert.match(fill, /setSignatureCustomizationEnabled\(true\)/);
assert.match(fill, /signatureConfigurations=\{previewSignatureConfigurations\}/);
assert.match(fill, /grid-cols-1/);
assert.match(fill, /Reset to template default/);
assert.match(renderer, /signatureConfigurations/);
assert.match(renderer, /effectiveConfiguration/);
assert.match(send, /eligibleRecipients/);
assert.match(send, /Signature Assignments/);
console.log('signature_customization_mode_static_check: PASS');
