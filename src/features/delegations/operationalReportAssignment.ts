import type { ReportAssignment, ReportInstance } from '../../types';

/**
 * Resolves only the operational subject's pending assignment in the report's
 * active send cycle. It never substitutes the authenticated actor for the
 * original recipient stored by the backend.
 */
export function getOperationalReportAssignment(
  report: Pick<ReportInstance, 'assignments' | 'currentSendCycleId'>,
  operationalSubjectUserId: string | null | undefined,
): ReportAssignment | null {
  if (!operationalSubjectUserId || !report.currentSendCycleId) return null;
  return report.assignments?.find((assignment) => (
    assignment.recipientUserId === operationalSubjectUserId
    && assignment.sendCycleId === report.currentSendCycleId
    && assignment.assignmentStatus === 'pending'
  )) ?? null;
}

export function hasOperationalReportSignatureAssignment(
  report: Pick<ReportInstance, 'signatureAssignments' | 'currentSendCycleId'>,
  assignment: ReportAssignment | null | undefined,
  operationalSubjectUserId: string | null | undefined,
): boolean {
  if (!assignment || !operationalSubjectUserId || !report.currentSendCycleId) return false;
  return report.signatureAssignments?.some((mapping) => (
    mapping.reportAssignmentId === assignment.id
    && mapping.recipientUserId === operationalSubjectUserId
    && mapping.sendCycleId === report.currentSendCycleId
  )) ?? false;
}
