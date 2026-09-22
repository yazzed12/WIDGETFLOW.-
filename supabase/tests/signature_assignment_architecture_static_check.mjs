import assert from 'node:assert/strict';
import fs from 'node:fs';

const renderer = fs.readFileSync('src/components/dynamic-template/SignatureRenderer.tsx', 'utf8');
const resolver = fs.readFileSync('src/shared/signatureResolver.ts', 'utf8');
const sendModal = fs.readFileSync('src/components/reports/SendReportModal.tsx', 'utf8');
const properties = fs.readFileSync('src/components/template-builder/PropertiesPanel.tsx', 'utf8');
const types = fs.readFileSync('src/types/index.ts', 'utf8');
const acknowledgement = fs.readFileSync('src/components/dynamic-template/AcknowledgementControl.tsx', 'utf8');
const signatures = fs.readFileSync('supabase/migrations/005_reports_signatures.sql', 'utf8');
const mappingSend = fs.readFileSync('supabase/migrations/047_report_signature_typed_font_snapshot.sql', 'utf8');

assert.doesNotMatch(renderer, /Signer:\s*\$\{currentUser\.name\}/,
  'draft signature fields must not identify the current viewer as signer');
assert.match(renderer, /Required signer:/);
assert.match(renderer, /actual signer and signature are shown only after an authorized workflow action/);
assert.match(resolver, /activeRoleMatches\.length === 1/);
assert.match(resolver, /historicalRoleMatches\.length === 1/);
assert.match(resolver, /componentKey.*component\.key/s);
assert.match(sendModal, /signatureMappings/);
assert.match(sendModal, /signatureFieldKey/);
assert.match(properties, /Required Role/);
assert.match(properties, /Fixed by Template/);
assert.match(properties, /Report Creator Can Override/);
assert.match(properties, /Report Creator Must Configure/);
assert.match(types, /requiredRole\?\: string/);
assert.match(types, /default_override_allowed/);
assert.match(signatures, /create table public\.report_signature_events/);
assert.match(signatures, /component_key text/);
assert.match(mappingSend, /insert into public\.report_signature_assignments/);
assert.match(mappingSend, /recipient_user_id/);
assert.match(acknowledgement, /new Date\(\)\.toISOString\(\)/);

console.log('signature assignment architecture static check passed');
