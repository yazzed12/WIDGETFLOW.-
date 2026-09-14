export type ReportAttachmentPrincipal = {
  userId: string;
  profileStatus: string;
  roleActive: boolean;
  effectivePermissions: string[];
};

export type ReportAttachmentTarget = {
  created_by_user_id: string;
  status: unknown;
  locked_at: unknown;
};

export function hasReportAttachmentPermission(
  principal: ReportAttachmentPrincipal,
): boolean {
  const canMutateDraft =
    principal.effectivePermissions.includes('reports.create') ||
    principal.effectivePermissions.includes('reports.edit_draft');

  return (
    principal.profileStatus.toLowerCase() === 'active' &&
    principal.roleActive &&
    principal.effectivePermissions.includes('reports.view_own') &&
    canMutateDraft
  );
}

/**
 * Pure authorization decision used after the caller and exact report row have
 * been resolved. Database/query failures are handled separately by the gateway.
 */
export function canWriteReportAttachment(
  principal: ReportAttachmentPrincipal,
  report: ReportAttachmentTarget | null,
): boolean {
  return Boolean(
    hasReportAttachmentPermission(principal) &&
      report &&
      report.created_by_user_id === principal.userId &&
      String(report.status).toLowerCase() === 'draft' &&
      report.locked_at === null,
  );
}
