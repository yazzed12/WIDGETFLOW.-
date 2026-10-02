import assert from 'node:assert/strict';
import { getOperationalReportAssignment, hasOperationalReportSignatureAssignment } from '../../src/features/delegations/operationalReportAssignment';
import { mapReportAuditEvent, mapReportNotificationRow, mapReportSignatureEvent } from '../../src/features/reports/reportService';
import { getDelegatedSignatureSnapshot } from '../../src/features/reports/signatureProvenance';
import { normalizeError } from '../../src/lib/errors/errorHandling';

const currentCycle = 'cycle-current';
const hassanAssignment = {
  id: 'assignment-hassan', reportId: 'report-1', sendCycleId: currentCycle,
  recipientUserId: 'profile-hassan', recipientName: 'Hassan', assignmentStatus: 'pending' as const,
};
const karimAssignment = {
  id: 'assignment-karim', reportId: 'report-1', sendCycleId: currentCycle,
  recipientUserId: 'profile-karim', recipientName: 'Karim', assignmentStatus: 'pending' as const,
};
const report = {
  assignments: [hassanAssignment, karimAssignment], currentSendCycleId: currentCycle,
  signatureAssignments: [{ reportAssignmentId: hassanAssignment.id, recipientUserId: 'profile-hassan', sendCycleId: currentCycle }],
};
const originalRecipientIds = report.assignments.map((assignment) => assignment.recipientUserId);

assert.equal(getOperationalReportAssignment(report, 'profile-gamal'), null, 'own mode does not select another user’s assignment');
const ownModeAssignment = getOperationalReportAssignment(report, 'profile-hassan');
assert.equal(ownModeAssignment?.id, hassanAssignment.id, 'own mode resolves its own original assignment');
assert.equal(ownModeAssignment?.recipientUserId, 'profile-hassan');
assert.equal(getOperationalReportAssignment(report, 'profile-karim')?.id, karimAssignment.id);

// Gamal remains the authenticated actor; only the selected operational subject
// changes which unchanged backend-owned assignment is actionable.
const actingForHassan = getOperationalReportAssignment(report, 'profile-hassan');
assert.equal(actingForHassan?.id, 'assignment-hassan');
assert.equal(actingForHassan?.recipientUserId, 'profile-hassan');
assert.notEqual(actingForHassan?.id, karimAssignment.id, 'Gamal acting for Hassan cannot resolve Karim’s assignment');
assert.equal(getOperationalReportAssignment(report, 'profile-karim')?.id, 'assignment-karim');
assert.equal(hasOperationalReportSignatureAssignment(report, actingForHassan, 'profile-hassan'), true);
assert.equal(hasOperationalReportSignatureAssignment(report, actingForHassan, 'profile-karim'), false);
assert.deepEqual(report.assignments.map((assignment) => assignment.recipientUserId), originalRecipientIds, 'resolution never rewrites recipient identities');

const signature = mapReportSignatureEvent({
  id: 'signature-1', report_id: 'report-1', report_assignment_id: 'assignment-hassan', send_cycle_id: currentCycle,
  signer_user_id: 'profile-gamal', signer_name: 'Gamal', signer_role_name: 'Employee', signer_role_key: 'employee',
  event_type: 'signed', signature_role: 'receiver', signature_method: 'typed', occurred_at: '2026-09-29T08:00:00Z',
  delegation_id: 'delegation-1', delegated_by_user_id: 'profile-hassan', delegated_by_name_snapshot: 'Hassan',
  authority_role_id: 'role-director', authority_role_key_snapshot: 'director', authority_role_name_snapshot: 'Director',
  authority_governance_level_snapshot: 'director', delegation_start_at_snapshot: '2026-09-29T07:00:00Z',
  delegation_end_at_snapshot: '2026-09-29T09:00:00Z',
});
assert.equal(signature.signedByUserId, 'profile-gamal', 'signature signer is the real authenticated actor');
assert.equal(signature.signedByRole, 'Employee', 'signer role is the permanent actor role');
assert.equal(signature.delegatedByNameSnapshot, 'Hassan');
assert.equal(signature.authorityRoleNameSnapshot, 'Director');
assert.equal(signature.delegationId, 'delegation-1');
assert.equal(signature.delegatedByUserId, 'profile-hassan');
assert.equal(signature.authorityRoleId, 'role-director');
assert.equal(signature.authorityRoleKeySnapshot, 'director');
assert.equal(signature.authorityGovernanceLevelSnapshot, 'director');
assert.equal(signature.delegationStartAtSnapshot, '2026-09-29T07:00:00Z');
assert.equal(signature.delegationEndAtSnapshot, '2026-09-29T09:00:00Z');
assert.deepEqual(getDelegatedSignatureSnapshot(signature), { authorityRoleName: 'Director', delegatedByName: 'Hassan' }, 'historical signature display uses the stored snapshot');
assert.equal(getDelegatedSignatureSnapshot({ signedByName: 'Gamal', signedByRole: 'Employee' }), null, 'normal signatures have no delegated context');

const audit = mapReportAuditEvent({
  id: 'audit-1', report_id: 'report-1', actor_user_id: 'profile-gamal', actor_name: 'Gamal',
  actor_role_name: 'Employee', actor_role_key: 'employee', event_type: 'REPORT_RETURNED',
  delegation_id: 'delegation-1', delegated_by_user_id: 'profile-hassan', delegated_by_name_snapshot: 'Hassan',
  authority_role_id: 'role-director', authority_role_name_snapshot: 'Director', authority_role_key_snapshot: 'director',
  authority_governance_level_snapshot: 'director',
  delegation_start_at_snapshot: '2026-09-29T07:00:00Z', delegation_end_at_snapshot: '2026-09-29T09:00:00Z',
  occurred_at: '2026-09-29T08:10:00Z', reason: 'Please correct the figures',
});
assert.equal(audit.actorUserId, 'profile-gamal');
assert.equal(audit.personName, 'Gamal');
assert.equal(audit.role, 'Employee');
assert.equal(audit.action, 'Returned');
assert.equal(audit.authorityRoleNameSnapshot, 'Director');
assert.equal(audit.delegatedByNameSnapshot, 'Hassan');
assert.equal(audit.delegationId, 'delegation-1');
assert.equal(audit.delegatedByUserId, 'profile-hassan');
assert.equal(audit.authorityRoleId, 'role-director');
assert.equal(audit.authorityRoleKeySnapshot, 'director');
assert.equal(audit.authorityGovernanceLevelSnapshot, 'director');
assert.equal(audit.delegationStartAtSnapshot, '2026-09-29T07:00:00Z');
assert.equal(audit.delegationEndAtSnapshot, '2026-09-29T09:00:00Z');
assert.equal(audit.comment, 'Please correct the figures');

const notification = mapReportNotificationRow({
  id: 'notification-1', recipient_user_id: 'profile-gamal', notification_type: 'REPORT_RECEIVED_DELEGATED',
  title: 'raw backend title', message: 'Hazem sent a report to Hassan.', is_read: false,
  related_report_id: 'report-1', report_assignment_id: 'assignment-hassan', send_cycle_id: currentCycle,
  delegation_id: 'delegation-1', original_recipient_user_id: 'profile-hassan',
  delegated_by_user_id: 'profile-hassan', delegated_by_name_snapshot: 'Hassan',
  authority_role_id: 'role-director', authority_role_name_snapshot: 'Director', authority_role_key_snapshot: 'director',
  authority_governance_level_snapshot: 'director', delegation_start_at_snapshot: '2026-09-29T07:00:00Z',
  delegation_end_at_snapshot: '2026-09-29T09:00:00Z', created_at: '2026-09-29T08:00:00Z',
});
assert.equal(notification.type, 'report_received_delegated');
assert.equal(notification.userId, 'profile-gamal', 'delegated notification remains owned by the authenticated actor');
assert.equal(notification.title, 'New report requires your attention');
assert.equal(notification.relatedReportId, 'report-1');
assert.equal(notification.originalRecipientUserId, 'profile-hassan');
assert.equal(notification.delegationId, 'delegation-1');
assert.equal(notification.delegatedByUserId, 'profile-hassan');
assert.equal(notification.authorityRoleNameSnapshot, 'Director');
assert.equal(notification.authorityRoleId, 'role-director');
assert.equal(notification.authorityRoleKeySnapshot, 'director');
assert.equal(notification.authorityGovernanceLevelSnapshot, 'director');
assert.equal(notification.delegationStartAtSnapshot, '2026-09-29T07:00:00Z');
assert.equal(notification.delegationEndAtSnapshot, '2026-09-29T09:00:00Z');

assert.equal(
  normalizeError(new Error('delegation expired | code=DELEGATION_CONTEXT_INVALID'), 'sign').message,
  'Your delegated authority has ended.',
  'expiry during a delegated mutation is safe and specific',
);
assert.equal(
  normalizeError(new Error('code=REPORT_NOT_ACTIONABLE'), 'return').message,
  'This report can no longer be returned.',
);
assert.equal(
  normalizeError(new Error('code=REPORT_NOT_ACTIONABLE'), 'reject').message,
  'This report can no longer be rejected.',
);
assert.equal(
  normalizeError(new Error('code=REPORT_NOT_ACTIONABLE'), 'sign').message,
  'This report can no longer be signed.',
);
assert.equal(
  normalizeError(new Error('code=SIGNATURE_ASSIGNMENT_REQUIRED'), 'return').message,
  'Only recipients assigned to sign this report can return it.',
);
assert.equal(
  normalizeError(new Error('code=SIGNATURE_ASSIGNMENT_REQUIRED'), 'reject').message,
  'Only recipients assigned to sign this report can reject it.',
);
assert.equal(
  normalizeError(new Error('code=SIGNATURE_ASSIGNMENT_REQUIRED'), 'sign').message,
  'You are not assigned to sign this report.',
);

console.log('delegated report assignment, signature/audit provenance, and notification runtime tests passed');
