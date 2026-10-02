import React from 'react';
import type { ReportInstance } from '../../types';
import { useApp } from '../../context/AppContext';
import { ReportSignatureModal } from '../report/ReportSignatureModal';
import { getOperationalReportAssignment } from '../../features/delegations/operationalReportAssignment';

interface SignReportModalProps {
  report: ReportInstance;
  onClose: () => void;
}

export const SignReportModal: React.FC<SignReportModalProps> = ({ report, onClose }) => {
  const { currentUser, signReport, operationalSubjectUserId, authorityContext, isDelegatedMode } = useApp();
  const subjectId = operationalSubjectUserId ?? currentUser.id;
  const assignment = getOperationalReportAssignment(report, subjectId);
  const signatureMapping = report.signatureAssignments?.find((mapping) => (
    mapping.reportAssignmentId === assignment?.id
    && mapping.recipientUserId === subjectId
    && mapping.sendCycleId === report.currentSendCycleId
  ));
  const requiredRoleKey = report.signatureConfigurations?.find((config) => config.signatureFieldKey === signatureMapping?.signatureFieldKey)?.requiredRoleKey ?? undefined;
  const requiredRoleLabel = requiredRoleKey?.split(/[_\s-]+/).filter(Boolean).map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join(' ');

  return (
    <ReportSignatureModal
      reportTitle={report.displayId ? `${report.title} · ${report.displayId}` : report.title}
      signatureRole={isDelegatedMode ? 'receiver' : report.createdById === subjectId ? 'sender' : 'receiver'}
      currentUser={currentUser}
      isDelegatedMode={isDelegatedMode}
      authorityRoleName={authorityContext?.mode === 'delegated' ? authorityContext.authority.roleName : undefined}
      delegatedByName={authorityContext?.mode === 'delegated' ? authorityContext.operationalSubject.fullName : undefined}
      requiredRoleKey={requiredRoleLabel}
      onConfirm={async (payload) => {
        await signReport(report.id, payload);
      }}
      onClose={onClose}
      isSupabaseReport={/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(report.id)}
    />
  );
};
