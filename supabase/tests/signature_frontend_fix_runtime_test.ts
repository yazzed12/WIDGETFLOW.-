import assert from 'node:assert/strict';
import { collectReportSignatureFieldDefinitions, normalizeReportTemplateSnapshot, serializeReportSignatureConfiguration } from '../../src/shared/signatureResolver';
import { normalizeError } from '../../src/lib/errors/errorHandling';

const sender = { type: 'signature', field_key: 'sender_signature', label: 'Signature', signatureConfig: { signatureRole: 'Sender', assignmentPolicy: 'fixed' } };
const receiver = { type: 'signature', field_key: 'receiver_signature', label: 'Signature', signatureConfig: { signatureRole: 'Receiver', assignmentPolicy: 'report_creator_required' } };
const duplicateWrapper = { sections: [{ components: [sender, receiver] }], fields: [{ ...sender }, { ...receiver }] };
const fields = collectReportSignatureFieldDefinitions(duplicateWrapper);
assert.deepEqual(fields.map((field) => field.fieldKey), ['sender_signature', 'receiver_signature']);
assert.equal(fields[0].label, fields[1].label, 'same labels must remain separate when business keys differ');
assert.equal(fields[1].assignmentPolicy, 'report_creator_required');
const explicitAny = serializeReportSignatureConfiguration(fields[1], { configured: true, requiredRoleKey: '  ' });
assert.equal(explicitAny.hasExplicitConfiguration, true);
assert.equal(explicitAny.requiredRole, null, 'explicit Any eligible role must serialize as null');

const creatorAny = normalizeError(new Error('SIGNATURE_CONFIGURATION_REQUIRED:receiver_signature | code=P0001'), 'complete');
assert.equal(creatorAny.code, 'SIGNATURE_CONFIGURATION_REQUIRED');
assert.equal(creatorAny.fieldKey, 'receiver_signature');
assert.equal(creatorAny.message, 'Please configure this signature field before completing the report.');

const roleMismatch = normalizeError(new Error('SIGNATURE_REQUIRED_ROLE_MISMATCH:receiver_signature | code=P0001'), 'send');
assert.equal(roleMismatch.code, 'SIGNATURE_REQUIRED_ROLE_MISMATCH');
assert.equal(roleMismatch.fieldKey, 'receiver_signature');
assert.doesNotMatch(roleMismatch.message, /P0001|Supabase|PostgreSQL|constraint/i);

assert.equal(normalizeError(new Error('SIGNATURE_CONFIGURATION_FIXED')).message, 'This signature configuration is fixed by the template and cannot be changed.');
assert.equal(normalizeError(new Error('SIGNATURE_REQUIRED_ROLE_NOT_FOUND')).message, 'The selected signer role is no longer available. Please choose another role.');
assert.equal(normalizeError(new Error('SIGNATURE_REQUIRED_ROLE_INVALID:receiver_signature')).fieldKey, 'receiver_signature');
assert.equal(normalizeError(new Error('SIGNATURE_FIELD_NOT_FOUND:receiver_signature')).code, 'SIGNATURE_FIELD_NOT_FOUND');
assert.equal(normalizeError(new Error('SIGNATURE_ROLE_IMMUTABLE')).code, 'SIGNATURE_ROLE_IMMUTABLE');
assert.equal(normalizeError(new Error('REPORT_SIGNATURE_CONFIGURATION_NOT_EDITABLE')).code, 'REPORT_SIGNATURE_CONFIGURATION_NOT_EDITABLE');

const normalizedAgain = normalizeError(creatorAny, 'complete');
assert.equal(normalizedAgain.code, creatorAny.code);
assert.equal(normalizedAgain.fieldKey, 'receiver_signature');

const wrapped = normalizeReportTemplateSnapshot({
  components: [{
    type: 'signature',
    field_key: 'head_approval',
    configuration: { signatureRole: 'Sender', requiredRole: 'director', assignmentPolicy: 'default_override_allowed' },
  }],
});
const wrappedField = collectReportSignatureFieldDefinitions(wrapped)[0];
assert.equal(wrappedField.signatureRole, 'sender');
assert.equal(wrappedField.defaultRequiredRoleKey, 'director');
assert.equal(wrappedField.assignmentPolicy, 'default_override_allowed');

console.log('signature_frontend_fix_runtime_test: PASS');
