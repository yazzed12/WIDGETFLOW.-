import assert from 'node:assert/strict';
import { collectReportSignatureFieldDefinitions } from '../../src/shared/signatureResolver';

const oldTemplate = {
  fields: [{
    field_key: 'manager_signature',
    field_type: 'signature',
    configuration: { signatureRole: 'Receiver', requiredRole: 'Manager', assignmentPolicy: 'fixed', label: 'Manager Signature' },
  }],
};
const newTemplate = {
  components: [{
    key: 'manager_signature',
    type: 'signature',
    label: 'Manager Signature',
    signatureConfig: { signatureRole: 'Receiver', requiredRole: 'Manager', assignmentPolicy: 'fixed' },
  }],
};

const normalize = (value: unknown) => collectReportSignatureFieldDefinitions(value).map((field) => ({
  fieldKey: field.fieldKey,
  label: field.label,
  signerContext: field.signatureRole,
  requiredRoleKey: field.defaultRequiredRoleKey?.toLowerCase() ?? null,
}));

assert.deepEqual(normalize(oldTemplate), normalize(newTemplate));
assert.deepEqual(normalize(oldTemplate), [{ fieldKey: 'manager_signature', label: 'Manager Signature', signerContext: 'receiver', requiredRoleKey: 'manager' }]);
const labelDoesNotAuthorize = normalize({ components: [{ key: 'employee_signature', type: 'signature', label: 'Manager Signature', signatureConfig: { signatureRole: 'Receiver', requiredRole: 'employee' } }] });
assert.equal(labelDoesNotAuthorize[0].requiredRoleKey, 'employee');
console.log('signature_old_new_compatibility_runtime_test: PASS');
