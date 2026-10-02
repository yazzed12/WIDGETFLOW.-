import type {
  Notification,
  ReportAssignment,
  ReportInstance,
  ReportAuditRecord,
  ReportStatus,
} from '../../types';

import { reportRepository } from './reportRepository';

import { normalizeReportTemplateSnapshot } from '../../shared/signatureResolver';

const firstRowValue = (row: Record<string, any>, ...keys: string[]) => keys
  .map((key) => row[key])
  .find((value) => value !== undefined && value !== null);

const nullableRowText = (row: Record<string, any>, ...keys: string[]) => {
  const value = firstRowValue(row, ...keys);
  return typeof value === 'string' && value.length ? value : null;
};

function mapDelegatedProvenance(row: Record<string, any>) {
  return {
    delegationId: nullableRowText(row, 'delegation_id', 'delegationId'),
    delegatedByUserId: nullableRowText(row, 'delegated_by_user_id', 'delegatedByUserId'),
    delegatedByNameSnapshot: nullableRowText(row, 'delegated_by_name_snapshot', 'delegated_by_name', 'delegatedByNameSnapshot', 'delegatedByName'),
    authorityRoleId: nullableRowText(row, 'authority_role_id', 'authorityRoleId'),
    authorityRoleKeySnapshot: nullableRowText(row, 'authority_role_key_snapshot', 'authority_role_key', 'authorityRoleKeySnapshot', 'authorityRoleKey'),
    authorityRoleNameSnapshot: nullableRowText(row, 'authority_role_name_snapshot', 'authority_role_name', 'authorityRoleNameSnapshot', 'authorityRoleName'),
    authorityGovernanceLevelSnapshot: nullableRowText(row, 'authority_governance_level_snapshot', 'authority_governance_level', 'authorityGovernanceLevelSnapshot', 'authorityGovernanceLevel'),
    delegationStartAtSnapshot: nullableRowText(row, 'delegation_start_at_snapshot', 'delegation_start_snapshot', 'delegationStartAtSnapshot'),
    delegationEndAtSnapshot: nullableRowText(row, 'delegation_end_at_snapshot', 'delegation_end_snapshot', 'delegationEndAtSnapshot'),
  };
}

export function mapReportSignatureEvent(row: Record<string, any>, reportId = String(row.report_id ?? '')) {
  return {
    id: row.id,
    reportId,
    reportAssignmentId: row.report_assignment_id,
    sendCycleId: row.send_cycle_id,
    componentId: row.component_id,
    componentKey: row.component_key,
    signedByUserId: String(firstRowValue(row, 'signer_user_id', 'signed_by_user_id') ?? ''),
    signedByName: String(firstRowValue(row, 'signer_name', 'signed_by_name') ?? 'Unknown user'),
    signedByRole: String(firstRowValue(row, 'signer_role_name', 'signer_role_name_snapshot', 'signed_by_role') ?? 'Role'),
    signedByRoleId: nullableRowText(row, 'signer_role_id', 'signer_role_id_snapshot', 'signed_by_role_id') ?? undefined,
    signedByRoleKey: nullableRowText(row, 'signer_role_key', 'signer_role_key_snapshot', 'signed_by_role_key') ?? undefined,
    signedByGovernanceLevel: nullableRowText(row, 'signer_governance_level', 'signer_governance_level_snapshot', 'signed_by_governance_level'),
    signatureRole: String(row.signature_role ?? 'receiver').toLowerCase() as 'sender' | 'receiver',
    signatureMethod: String(row.signature_method ?? 'typed').toLowerCase() as 'uploaded' | 'drawn' | 'typed',
    verificationId: String(row.verification_id ?? ''),
    signedContentHash: row.signed_content_hash ?? undefined,
    signedAt: String(firstRowValue(row, 'occurred_at', 'signed_at', 'created_at') ?? ''),
    isActive: String(row.event_type ?? 'signed').toLowerCase() === 'signed',
    ...mapDelegatedProvenance(row),
  };
}

const reportAuditAction = (eventType: unknown): ReportAuditRecord['action'] => {
  const actions: Record<string, string> = {
    REPORT_DRAFT_SAVED: 'Saved Draft',
    REPORT_COMPLETED: 'Completed',
    REPORT_SENT: 'Sent',
    REPORT_RETURNED: 'Returned',
    REPORT_REJECTED: 'Rejected',
    REPORT_SIGNED: 'Signed',
    REPORT_FULLY_SIGNED: 'Fully Signed',
    REPORT_COMMENT_ADDED: 'Commented',
  };
  return (actions[String(eventType ?? '').toUpperCase()] ?? 'Created') as ReportAuditRecord['action'];
};

export function mapReportAuditEvent(row: Record<string, any>, reportId = String(row.report_id ?? '')) {
  return {
    id: row.id,
    reportId,
    personName: String(firstRowValue(row, 'actor_name', 'actor_name_snapshot') ?? 'Unknown user'),
    role: String(firstRowValue(row, 'actor_role_name', 'actor_role_name_snapshot') ?? 'Role'),
    actorUserId: nullableRowText(row, 'actor_user_id', 'actorUserId'),
    actorRoleId: nullableRowText(row, 'actor_role_id', 'actor_role_id_snapshot', 'actorRoleId'),
    actorRoleKey: nullableRowText(row, 'actor_role_key', 'actor_role_key_snapshot', 'actorRoleKey'),
    actorGovernanceLevel: nullableRowText(row, 'actor_governance_level', 'actor_governance_level_snapshot', 'actorGovernanceLevel'),
    action: reportAuditAction(row.event_type),
    timestamp: String(firstRowValue(row, 'occurred_at', 'created_at') ?? ''),
    comment: row.comment ?? row.reason ?? undefined,
    ...mapDelegatedProvenance(row),
  };
}

export function mapReportNotificationRow(row: Record<string, any>): Notification {
  const type = String(row.notification_type ?? '').toLowerCase() as Notification['type'];
  const delegated = type === 'report_received_delegated';
  return {
    id: String(row.id ?? ''),
    userId: String(row.recipient_user_id ?? ''),
    title: delegated ? 'New report requires your attention' : type === 'template_review_requested_delegated' ? 'Template requires your delegated review' : String(row.title ?? ''),
    message: String(row.message ?? ''),
    type,
    read: Boolean(row.is_read),
    readAt: row.read_at ?? undefined,
    timestamp: String(row.created_at ?? ''),
    relatedEntityId: row.related_template_id ?? undefined,
    relatedTemplateId: row.related_template_id ?? undefined,
    relatedReportId: row.related_report_id ?? undefined,
    sendCycleId: row.send_cycle_id ?? undefined,
    reportAssignmentId: row.report_assignment_id ?? undefined,
    originalRecipientUserId: nullableRowText(row, 'original_recipient_user_id', 'originalRecipientUserId'),
    ...mapDelegatedProvenance(row),
  };
}

const statusMap: Record<string, ReportStatus> = {
  draft: 'Draft',
  completed: 'Completed',
  sent: 'Sent',
  returned: 'Returned',
  signed: 'Signed',
  rejected: 'Rejected',
};

export function mapReportRow(row: any, detailLoaded = false): ReportInstance {
  const sourceType: ReportInstance['sourceType'] = row.source_type === 'uploaded' ? 'uploaded' : 'template';
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
  const templateSnapshot = sourceType === 'template'
    ? normalizeReportTemplateSnapshot({
        ...snapshot,
        id: row.template_id,
        name: row.template_name_snapshot,
        version: row.template_version_snapshot,
      })
    : undefined;

  const signatureEvents = (row.report_signature_events ?? []).map((s: any) => mapReportSignatureEvent(s, row.id));

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

  const documentVersions = (row.report_document_versions ?? []).map((version: any) => ({
    id: version.id,
    reportId: version.report_id ?? row.id,
    assetId: version.asset_id ?? version.asset_metadata_id ?? version.document_asset_id ?? '',
    versionNumber: Number(version.version_number ?? version.document_version_number ?? version.version ?? 0),
    filename: version.original_filename ?? version.filename ?? version.file_name ?? '',
    mimeType: version.mime_type ?? version.content_type ?? '',
    byteSize: Number(version.byte_size ?? version.file_size ?? 0) || undefined,
    createdAt: version.created_at ?? version.uploaded_at,
  }));

  const sendCycles = (row.report_send_cycles ?? []).map((cycle: any) => ({
    id: cycle.id,
    cycleNumber: Number(cycle.cycle_number ?? 0),
    documentVersionId: cycle.report_document_version_id ?? null,
    status: cycle.status,
    sentAt: cycle.sent_at,
  }));

  return {
    id: row.id,
    detailLoaded,
    displayId: row.report_display_id ?? undefined,
    sourceType,
    templateId: sourceType === 'template' ? row.template_id : null,
    templateVersionId: sourceType === 'template' ? row.template_version_id : null,
    templateName: sourceType === 'template' ? row.template_name_snapshot : null,
    templateVersion: sourceType === 'template' ? row.template_version_snapshot : undefined,
    currentDocumentVersionId: row.current_document_version_id ?? null,
    documentVersions,
    sendCycles,
    title: row.title,
    categoryId: row.category_id ?? null,
    categoryName: row.category_name_snapshot ?? null,
    createdById: row.created_by_user_id,
    operationalSubjectUserId: row.operational_subject_user_id,
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
    auditHistory: (row.report_audit_events ?? []).map((event: any) => mapReportAuditEvent(event, row.id)),
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
    return (await reportRepository.list()).map((row) => mapReportRow(row));
  },

  async get(id: string) {
    return mapReportRow(await reportRepository.get(id), true);
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

  async createUploaded(title: string) {
    const result = await reportRepository.createUploaded(title);
    return mapReportRow(result.report ?? result);
  },

  async attachUploadedDocument(reportId: string, assetId: string) {
    return reportRepository.attachUploadedDocument(reportId, assetId);
  },

  async sendUploaded(id: string, recipientIds: string[], note?: string) {
    return reportRepository.sendUploaded(id, recipientIds, note);
  },

  async returnUploaded(id: string, assignmentId: string, reason: string) {
    return reportRepository.returnUploadedReport(id, assignmentId, reason);
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
    ).map(mapReportNotificationRow);
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
