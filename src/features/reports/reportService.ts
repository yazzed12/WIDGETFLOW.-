import type {
  Notification,
  ReportAssignment,
  ReportInstance,
  ReportStatus,
} from '../../types';

import { reportRepository } from './reportRepository';

import { normalizeReportTemplateSnapshot } from '../../shared/signatureResolver';

const statusMap: Record<string, ReportStatus> = {
  draft: 'Draft',
  completed: 'Completed',
  sent: 'Sent',
  returned: 'Returned',
  signed: 'Signed',
  rejected: 'Rejected',
};

export function mapReportRow(row: any): ReportInstance {
  const values = (row.report_values ?? []).reduce(
    (acc: Record<string, any>, v: any) => {
      acc[v.field_key] = v.value;
      return acc;
    },
    {}
  );

  const assignments: ReportAssignment[] = (
    row.report_assignments ?? []
  ).map((a: any) => ({
    id: a.id,
    sendCycleId: a.send_cycle_id,
    recipientUserId: a.recipient_user_id,
    recipientName: a.recipient_name_snapshot,
    recipientEmail: a.recipient_email_snapshot,
    recipientRoleId: a.recipient_role_id_snapshot,
    recipientRoleKey: a.recipient_role_key_snapshot,
    recipientRoleName: a.recipient_role_name_snapshot,
    recipientGovernanceLevel: a.recipient_governance_level_snapshot,
    assignmentStatus: a.assignment_status,
    assignmentSequence: a.assignment_sequence,
  }));

  const firstAssignment = assignments[0];

  const versionRow = Array.isArray(row.template_versions)
    ? row.template_versions[0]
    : row.template_versions;

  const snapshot = versionRow?.schema_snapshot ?? {};

  const templateSnapshot = normalizeReportTemplateSnapshot({
    ...snapshot,
    id: row.template_id,
    name: row.template_name_snapshot,
    version: row.template_version_snapshot,
  });

  const signatureEvents = (row.report_signature_events ?? []).map(
    (s: any) => ({
      id: s.id,
      reportId: row.id,
      reportAssignmentId: s.report_assignment_id,
      sendCycleId: s.send_cycle_id,
      componentId: s.component_id,
      componentKey: s.component_key,
      signerUserId: s.signer_user_id,
      signedByName: s.signer_name,
      signedByRole: s.signer_role_name,
      signerRole: s.signature_role,
      signatureMethod: s.signature_method,
      verificationId: s.verification_id,
      signedContentHash: s.signed_content_hash,
      signedAt: s.occurred_at,
      isActive: s.event_type === 'signed',
    })
  );

  const signatureAssignments = (
    row.report_signature_assignments ?? []
  ).map((m: any) => ({
    id: m.id,
    reportId: m.report_id,
    sendCycleId: m.send_cycle_id,
    reportAssignmentId: m.report_assignment_id,
    recipientUserId: m.recipient_user_id,
    signatureFieldKey: m.signature_field_key,
    signatureFieldLabelSnapshot: m.signature_field_label_snapshot,
  }));

  const signatureConfigurations = (
    row.report_signature_configurations ?? []
  ).map((c: any) => ({
    id: c.id,
    reportId: c.report_id,
    signatureFieldKey: c.signature_field_key,
    signatureRole: String(c.signature_role ?? '').toLowerCase() as 'sender' | 'receiver',
    requiredRoleKey: c.required_role_key ?? null,
    displayLabelOverride: c.display_label_override ?? null,
    assignmentPolicy: c.assignment_policy,
    isOverride: c.is_override,
    inherited: false,
  }));

  return {
    id: row.id,
    displayId: row.report_display_id ?? undefined,
    templateId: row.template_id,
    templateVersionId: row.template_version_id,
    templateName: row.template_name_snapshot,
    templateVersion: row.template_version_snapshot,
    title: row.title,
    categoryId: row.category_id,
    categoryName: row.category_name_snapshot,
    createdById: row.created_by_user_id,
    createdByName: row.creator_name,
    createdByRole: row.creator_role_name,
    status: statusMap[row.status] ?? 'Draft',
    sentToId: firstAssignment?.recipientUserId,
    sentToName: firstAssignment?.recipientName,
    assignments,
    signatureAssignments,
    signatureConfigurations,
    currentSendCycleId: row.current_send_cycle_id,
    lockedAt: row.locked_at,
    sentAt: row.sent_at,
    senderNote: row.sender_note,
    returnReason: row.return_reason ?? null,
    returnedAt: row.returned_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    rejectedAt: row.rejected_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    data: values,
    values,
    templateSnapshot,
    activeSignatures: signatureEvents.filter((s: any) => s.isActive),
    signatureHistory: signatureEvents,
    auditHistory: (row.report_audit_events ?? []).map((e: any) => ({
      id: e.id,
      reportId: row.id,
      personName: e.actor_name,
      role: e.actor_role_name,
      action:
        e.event_type === 'REPORT_DRAFT_SAVED'
          ? 'Saved Draft'
          : e.event_type === 'REPORT_COMPLETED'
            ? 'Completed'
            : e.event_type === 'REPORT_SENT'
              ? 'Sent'
              : e.event_type === 'REPORT_RETURNED'
                ? 'Returned'
                : 'Created',
      timestamp: e.occurred_at,
      comment: e.comment,
    })),
  };
}

export function normalizeRoleKey(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeRecipientDirectoryRow(r: any) {
  const fullName = r.full_name ?? r.fullName ?? r.name ?? '';
  const roleName = r.role_name ?? r.roleName ?? r.role ?? '';
  const roleKey = r.role_key ?? r.roleKey ?? '';
  const id = r.user_id ?? r.userId ?? r.id;
  return {
    userId: id,
    fullName,
    id,
    name: fullName,
    email: r.email,
    roleId: r.role_id ?? r.roleId,
    roleKey,
    roleName,
    role: roleName,
    governanceLevel: r.governance_level ?? r.governanceLevel,
    department: r.department ?? '',
    profileCode: r.profile_code ?? r.profileCode ?? '',
    avatarInitials: String(fullName)
      .split(/\s+/)
      .slice(0, 2)
      .map((x: string) => x[0])
      .join('')
      .toUpperCase(),
    avatarBg: 'bg-slate-600',
    status: 'Active',
  };
}

/** Resolve a template/report role value to the canonical role key exposed by the directory. */
export function resolveCanonicalRecipientRoleKey(requiredRole: unknown, recipients: any[]): string {
  const normalizedRequiredRole = normalizeRoleKey(requiredRole);
  if (!normalizedRequiredRole) return '';
  const match = recipients.find((recipient) => (
    normalizeRoleKey(recipient.roleKey) === normalizedRequiredRole
    || normalizeRoleKey(recipient.roleName ?? recipient.role) === normalizedRequiredRole
    || normalizeRoleKey(recipient.roleId) === normalizedRequiredRole
  ));
  return normalizeRoleKey(match?.roleKey ?? requiredRole);
}

export const reportService = {
  async listRecipientDirectory() {
    return (await reportRepository.listRecipientDirectory()).map(normalizeRecipientDirectoryRow);
  },

  async list() {
    return (await reportRepository.list()).map(mapReportRow);
  },

  async get(id: string) {
    return mapReportRow(await reportRepository.get(id));
  },

  async create(
    templateId: string,
    values?: Record<string, any>,
    title?: string
  ) {
    return mapReportRow(
      await reportRepository.create(templateId, values, title)
    );
  },

  async saveDraft(
    id: string,
    values: Record<string, any>,
    title: string
  ) {
    return mapReportRow(
      await reportRepository.saveDraft(id, values, title)
    );
  },

  async complete(
    id: string,
    values: Record<string, any>,
    title?: string
  ) {
    return mapReportRow(
      await reportRepository.complete(id, values, title)
    );
  },

  async send(
    id: string,
    recipientIds: string[],
    note?: string,
    signatureMappings: Array<{
      recipientUserId: string;
      signatureFieldKey: string;
    }> = []
  ) {
    const result = await reportRepository.send(
      id,
      recipientIds,
      note,
      signatureMappings
    );

    return {
      ...mapReportRow(result.report),
      sendCycle: result.send_cycle,
      assignments: result.assignments,
    };
  },

  // IMPORTANT:
  // Do NOT map the RPC response here.
  // Return is already committed in Supabase.
  // AppContext refreshes the authoritative report state afterwards.
  async returnReport(
    id: string,
    assignmentId: string,
    reason: string
  ) {
    return reportRepository.returnReport(
      id,
      assignmentId,
      reason
    );
  },

  async rejectReport(id: string, assignmentId: string, reason: string) {
    return reportRepository.rejectReport(id, assignmentId, reason);
  },

  async signReport(
    id: string,
    assignmentId: string,
    payload?: any
  ) {
    return reportRepository.signReport(
      id,
      assignmentId,
      payload
    );
  },

  async setSignatureConfiguration(
    reportId: string,
    signatureFieldKey: string,
    signatureRole: 'sender' | 'receiver',
    requiredRole?: string | null,
    displayLabel?: string | null,
  ) {
    return reportRepository.setSignatureConfiguration(reportId, signatureFieldKey, signatureRole, requiredRole, displayLabel);
  },

  async resetSignatureConfiguration(reportId: string, signatureFieldKey: string) {
    return reportRepository.resetSignatureConfiguration(reportId, signatureFieldKey);
  },

  async listNotifications(
    userId: string
  ): Promise<Notification[]> {
    return (
      await reportRepository.listNotifications(userId)
    ).map((n: any) => ({
      id: n.id,
      userId: n.recipient_user_id,
      title: n.title,
      message: n.message,
      type: String(n.notification_type).toLowerCase() as Notification['type'],
      read: n.is_read,
      readAt: n.read_at,
      timestamp: n.created_at,
      relatedEntityId: n.related_template_id,
      relatedTemplateId: n.related_template_id,
      relatedReportId: n.related_report_id,
      sendCycleId: n.send_cycle_id,
      reportAssignmentId: n.report_assignment_id,
    }));
  },
  async markNotificationRead(notificationId: string, userId: string): Promise<Notification[]> {
    await reportRepository.markMyNotificationRead(notificationId);
    return this.listNotifications(userId);
  },
  async markAllNotificationsRead(userId: string): Promise<Notification[]> {
    await reportRepository.markMyNotificationsRead();
    return this.listNotifications(userId);
  },
  async listReportComments(reportId: string) { return (await reportRepository.listReportComments(reportId)).map((c: any) => ({ id: c.id, reportId: c.report_id, userId: c.author_user_id, userName: c.author_name, userRole: c.author_role_name, message: c.message, timestamp: c.created_at })); },
  async addReportComment(reportId: string, message: string) { return (await reportRepository.addReportComment(reportId, message)).map((c: any) => ({ id: c.id, reportId: c.report_id, userId: c.author_user_id, userName: c.author_name, userRole: c.author_role_name, message: c.message, timestamp: c.created_at })); },
};
