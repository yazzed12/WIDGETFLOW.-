import assert from 'node:assert/strict';
import { isSignatureConfigurationComplete, resolveEffectiveReportSignatureFields, resolveReportAssignmentForComponent, resolveReportSignatureForComponent } from '../../src/shared/signatureResolver.ts';
import { serializeTemplateDraft } from '../../src/features/templates/mappers/templateSerializer.ts';
import { normalizeReportTemplateSnapshot } from '../../src/shared/signatureResolver.ts';
import type { ReportSignatureRecord } from '../../src/types/index.ts';

const component = { id: 'field-1', key: 'receiver_primary', type: 'signature', signatureConfig: { signatureRole: 'Receiver' } } as any;
const signature = (id: string, overrides: Partial<ReportSignatureRecord> = {}): ReportSignatureRecord => ({
  id,
  reportId: 'report-1',
  signedByUserId: `user-${id}`,
  signedByName: `Signer ${id}`,
  signedByRole: 'Manager',
  signatureRole: 'receiver',
  signatureMethod: 'typed',
  typedName: `Signer ${id}`,
  verificationId: `verification-${id}`,
  isActive: true,
  signedAt: '2026-09-16T10:00:00.000Z',
  ...overrides,
});

const one = signature('one');
assert.equal(resolveReportSignatureForComponent({ component, activeSignatures: [one] })?.id, 'one');

const two = [signature('one'), signature('two')];
assert.equal(resolveReportSignatureForComponent({ component, activeSignatures: two }), null,
  'ambiguous role-only receiver signatures must not bleed into another field');

const exact = signature('exact', { componentKey: 'receiver_primary' });
assert.equal(resolveReportSignatureForComponent({ component, activeSignatures: [signature('other'), exact] })?.id, 'exact');

const mapped = signature('mapped', { reportAssignmentId: 'assignment-2' });
assert.equal(resolveReportSignatureForComponent({
  component,
  activeSignatures: [signature('other'), mapped],
  signatureAssignments: [{ id: 'mapping-1', reportId: 'report-1', sendCycleId: 'cycle-1', reportAssignmentId: 'assignment-2', recipientUserId: 'user-mapped', signatureFieldKey: 'receiver_primary' }],
})?.id, 'mapped');
assert.equal(resolveReportAssignmentForComponent({
  component,
  signatureAssignments: [{ id: 'mapping-1', reportId: 'report-1', sendCycleId: 'cycle-1', reportAssignmentId: 'assignment-2', recipientUserId: 'user-mapped', signatureFieldKey: 'receiver_primary' }],
  assignments: [{ id: 'assignment-2', sendCycleId: 'cycle-1', recipientUserId: 'user-mapped', assignmentStatus: 'pending' } as any],
})?.recipientUserId, 'user-mapped');

const historicalExact = signature('historical-exact', { componentId: 'field-1' });
assert.equal(resolveReportSignatureForComponent({ component, signatureHistory: [historicalExact] })?.id, 'historical-exact');

const template = {
  id: 'template-1',
  name: 'Approval template',
  description: '',
  categoryId: 'category-1',
  createdById: 'creator-1',
  createdByName: 'Creator',
  createdByRole: 'Employee',
  createdAt: '2026-09-16T09:00:00.000Z',
  updatedAt: '2026-09-16T09:00:00.000Z',
  status: 'Draft',
  tags: [],
  dynamicSections: [{ id: 'section-1', title: 'Signatures', order: 0, components: [{ ...component, signatureConfig: { signatureRole: 'Receiver', requiredRole: 'Manager', assignmentPolicy: 'default_override_allowed' } }] }],
};
const serialized = serializeTemplateDraft(template as any);
const persistedConfig = (serialized.sections[0].components[0] as any).signatureConfig;
assert.deepEqual(persistedConfig, { signatureRole: 'Receiver', requiredRole: 'Manager', assignmentPolicy: 'default_override_allowed' });
const snapshot = normalizeReportTemplateSnapshot({ sections: serialized.sections });
assert.equal((snapshot.components[0] as any).signatureConfig.requiredRole, 'Manager');
assert.equal((snapshot.components[0] as any).signatureConfig.assignmentPolicy, 'default_override_allowed');

const effective = resolveEffectiveReportSignatureFields(template as any, [{
  id: 'override-1', reportId: 'report-1', signatureFieldKey: 'receiver_primary',
  signatureRole: 'sender', requiredRoleKey: 'Employee', displayLabelOverride: 'Final approval',
  assignmentPolicy: 'default_override_allowed', isOverride: true,
}]);
assert.deepEqual(effective.map(({ fieldKey, displayLabel, signerContext, requiredRoleKey, source }) => ({ fieldKey, displayLabel, signerContext, requiredRoleKey, source })), [{
  fieldKey: 'receiver_primary', displayLabel: 'Final approval', signerContext: 'sender', requiredRoleKey: 'Employee', source: 'report-override',
}], 'context, role, and label overrides must share the stable field-key identity');
const requiredField = { ...effective[0], assignmentPolicy: 'report_creator_required' as const };
assert.equal(isSignatureConfigurationComplete(requiredField, {
  configured: true,
  requiredRoleKey: 'Employee',
  displayLabel: 'Final approval',
  signatureRole: 'sender',
}, ['employee']), true, 'role validation must be canonical and case-insensitive');
assert.equal(isSignatureConfigurationComplete(requiredField, {
  configured: true,
  requiredRoleKey: '',
  displayLabel: 'Final approval',
  signatureRole: 'sender',
}, ['employee']), false, 'a configured required-role field cannot pass without a role');

console.log('signature resolver runtime test passed');
