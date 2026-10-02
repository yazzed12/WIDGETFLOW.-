import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { measureDev } from '../../shared/devPerformance';
import { supabaseRequestError } from '../../lib/errors/supabaseRequestError';
import { readBatchedByIds } from '../workspace/batchedRead';

const unwrap = (data: any) => data?.report ?? data;
const required = (data: any, error: any, status?: number) => {
  if (error) {
    const wrapped = supabaseRequestError(error, status, String(error.message || 'Supabase Report operation failed'));
    if (import.meta.env.DEV) {
      console.warn('[WidgetFlow Supabase Report read]', { code: wrapped.code, status: wrapped.status });
    }
    throw wrapped;
  }
  if (data == null) throw new Error('No report data returned'); return data;
};

async function attachUploadedDocumentState(rows: any[]) {
  const reportIds = rows.map((row) => row.id).filter(Boolean);
  if (!reportIds.length) return rows;

  const client = getSupabaseBrowserClient();
  const [versionsResult, cyclesResult] = await Promise.all([
    client.from('report_document_versions').select('*').in('report_id', reportIds),
    client.from('report_send_cycles').select('*').in('report_id', reportIds),
  ]);
  const versions = required(versionsResult.data, versionsResult.error, versionsResult.status) as any[];
  const cycles = required(cyclesResult.data, cyclesResult.error, cyclesResult.status) as any[];
  const versionsByReport = new Map<string, any[]>();
  const cyclesByReport = new Map<string, any[]>();
  for (const version of versions) {
    const entries = versionsByReport.get(version.report_id) ?? [];
    entries.push(version);
    versionsByReport.set(version.report_id, entries);
  }
  for (const cycle of cycles) {
    const entries = cyclesByReport.get(cycle.report_id) ?? [];
    entries.push(cycle);
    cyclesByReport.set(cycle.report_id, entries);
  }
  return rows.map((row) => ({
    ...row,
    report_document_versions: versionsByReport.get(row.id) ?? [],
    report_send_cycles: cyclesByReport.get(row.id) ?? [],
  }));
}

async function attachTemplateDetailState(rows: any[]) {
  const templateRows = rows.filter((row) => row.source_type !== 'uploaded');
  const reportIds = templateRows.map((row) => row.id).filter(Boolean);
  const versionIds = templateRows.map((row) => row.template_version_id).filter(Boolean);
  if (!reportIds.length) return rows;
  const client = getSupabaseBrowserClient();
  const [versions, events, signatureAssignments, signatureConfigurations] = await Promise.all([
    versionIds.length ? measureDev('reportRepository.templateVersionSnapshots', async () => await client.from('template_versions').select('id,schema_snapshot').in('id', versionIds)) : Promise.resolve({ data: [], error: null, status: 200 }),
    client.from('report_signature_events').select([
      'id', 'report_id', 'report_assignment_id', 'send_cycle_id', 'event_type', 'component_id', 'component_key',
      'signer_user_id', 'signer_name', 'signer_email', 'signer_role_id', 'signer_role_key', 'signer_role_name',
      'signer_governance_level', 'signature_role', 'signature_method', 'verification_id', 'signed_content_hash',
      'occurred_at', 'delegation_id', 'delegated_by_user_id', 'delegated_by_name_snapshot', 'authority_role_id',
      'authority_role_key_snapshot', 'authority_role_name_snapshot', 'authority_governance_level_snapshot',
      'delegation_start_at_snapshot', 'delegation_end_at_snapshot',
    ].join(',')).in('report_id', reportIds),
    client.from('report_signature_assignments').select('id,report_id,send_cycle_id,report_assignment_id,recipient_user_id,signature_field_key,signature_field_label_snapshot').in('report_id', reportIds),
    client.from('report_signature_configurations').select('id,report_id,signature_field_key,signature_role,required_role_key,display_label_override,assignment_policy,is_override,created_at,updated_at').in('report_id', reportIds),
  ]);
  const templateVersions = required(versions.data, versions.error, versions.status) as any[];
  const signatureEvents = required(events.data, events.error, events.status) as any[];
  const signatureMaps = required(signatureAssignments.data, signatureAssignments.error, signatureAssignments.status) as any[];
  const signatureConfigs = required(signatureConfigurations.data, signatureConfigurations.error, signatureConfigurations.status) as any[];
  const byReport = (items: any[]) => {
    const map = new Map<string, any[]>();
    for (const item of items) { const list = map.get(item.report_id) ?? []; list.push(item); map.set(item.report_id, list); }
    return map;
  };
  const eventsByReport = byReport(signatureEvents);
  const mapsByReport = byReport(signatureMaps);
  const configsByReport = byReport(signatureConfigs);
  const versionsById = new Map(templateVersions.map((version) => [version.id, version]));
  return rows.map((row) => row.source_type === 'uploaded' ? row : ({
    ...row,
    template_versions: versionsById.get(row.template_version_id) ?? null,
    report_signature_events: eventsByReport.get(row.id) ?? [],
    report_signature_assignments: mapsByReport.get(row.id) ?? [],
    report_signature_configurations: configsByReport.get(row.id) ?? [],
  }));
}

const REPORT_LIST_SELECT = [
  'id', 'report_display_id', 'source_type', 'template_id', 'template_version_id', 'template_name_snapshot',
  'template_version_snapshot', 'category_id', 'category_name_snapshot', 'title', 'status', 'created_by_user_id',
  'operational_subject_user_id', 'creator_name', 'creator_role_name', 'current_document_version_id', 'current_send_cycle_id', 'locked_at',
  'sent_at', 'sender_note', 'return_reason', 'returned_at', 'rejection_reason', 'rejected_at', 'created_at', 'updated_at',
  'report_assignments(id,send_cycle_id,recipient_user_id,recipient_name_snapshot,recipient_email_snapshot,recipient_role_id_snapshot,recipient_role_key_snapshot,recipient_role_name_snapshot,recipient_governance_level_snapshot,assignment_status,assignment_sequence)',
].join(',');

async function attachCurrentCycleSignatureMappings(rows: any[]) {
  const candidates = rows.flatMap((row) => {
    if (row.source_type === 'uploaded' || row.status !== 'sent' || !row.current_send_cycle_id) return [];
    return (row.report_assignments ?? []).filter((assignment: any) => (
      assignment.send_cycle_id === row.current_send_cycle_id
      && assignment.assignment_status === 'pending'
    ));
  });
  const assignmentIds = [...new Set(candidates.map((assignment: any) => assignment.id).filter(Boolean))];
  const mappings = assignmentIds.length ? await measureDev('reportRepository.listSignatureMappings', () =>
    readBatchedByIds(assignmentIds, async (batch) => {
      const { data, error, status } = await getSupabaseBrowserClient()
        .from('report_signature_assignments')
        .select('id,report_id,send_cycle_id,report_assignment_id,recipient_user_id,signature_field_key,signature_field_label_snapshot')
        .in('report_assignment_id', batch);
      return required(data, error, status) as any[];
    })) : [];
  const mappingsByReport = new Map<string, any[]>();
  for (const mapping of mappings) {
    const bucket = mappingsByReport.get(mapping.report_id) ?? [];
    bucket.push(mapping);
    mappingsByReport.set(mapping.report_id, bucket);
  }
  return rows.map((row) => {
    const currentAssignments = row.current_send_cycle_id
      ? (row.report_assignments ?? []).filter((assignment: any) => assignment.send_cycle_id === row.current_send_cycle_id)
      : [];
    return {
      ...row,
      report_assignments: currentAssignments,
      report_signature_assignments: mappingsByReport.get(row.id) ?? [],
      report_signature_configurations: [],
      report_signature_events: [],
      report_values: [],
      report_audit_events: [],
    };
  });
}

export const reportRepository = {
  async listRecipientDirectory() {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('list_report_recipient_directory');
    return required(data, error, status) as any[];
  },
  async list() {
    return measureDev('reportRepository.list', async () => {
      const c = getSupabaseBrowserClient();
      const { data, error, status } = await c.from('reports').select(REPORT_LIST_SELECT).order('updated_at', { ascending: false });
      const base = required(data, error, status) as any[];
      return attachCurrentCycleSignatureMappings(base);
    });
  },
  async get(id: string) {
    return measureDev('reportRepository.detail', async () => {
      const c = getSupabaseBrowserClient();
      const result = await c.from('reports').select('*, report_values(*), report_assignments(*), report_audit_events(*)').eq('id', id).maybeSingle();
      const { data, error, status } = result;
      const row = required(data, error, status) as any;
      return (await attachUploadedDocumentState(await attachTemplateDetailState([row])))[0];
    });
  },
  async create(templateId: string, values: Record<string, any> = {}, title?: string) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('create_report_from_template', { p_template_id: templateId, p_title: title ?? null, p_values: values });
    return unwrap(required(data, error, status));
  },
  async createUploaded(title: string) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('create_uploaded_report', { p_title: title });
    return required(data, error, status) as any;
  },
  async attachUploadedDocument(reportId: string, assetId: string) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('attach_uploaded_report_document', {
      p_report_id: reportId,
      p_asset_id: assetId,
    });
    return required(data, error, status) as any;
  },
  async saveDraft(reportId: string, values: Record<string, any>, title: string) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('save_report_draft', { p_report_id: reportId, p_title: title, p_values: values });
    return unwrap(required(data, error, status));
  },
  async complete(reportId: string, values: Record<string, any>, title?: string) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('complete_report', { p_report_id: reportId, p_title: title ?? null, p_values: values });
    return unwrap(required(data, error, status));
  },
  async send(reportId: string, recipientIds: string[], note?: string, signatureMappings: Array<{ recipientUserId: string; signatureFieldKey: string }> = []) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('send_report', { p_report_id: reportId, p_recipient_user_ids: recipientIds, p_note: note ?? null, p_signature_mappings: signatureMappings });
    return required(data, error, status) as any;
  },
  async sendUploaded(reportId: string, recipientIds: string[], note?: string) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('send_uploaded_report', {
      p_report_id: reportId,
      p_recipient_user_ids: recipientIds,
      p_note: note ?? null,
    });
    return required(data, error, status) as any;
  },
  async returnReport(reportId: string, assignmentId: string, reason: string) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('return_report', { p_report_id: reportId, p_assignment_id: assignmentId, p_reason: reason });
    return unwrap(required(data, error, status));
  },
  async returnUploadedReport(reportId: string, assignmentId: string, reason: string) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('return_uploaded_report', {
      p_report_id: reportId,
      p_assignment_id: assignmentId,
      p_reason: reason,
    });
    return required(data, error, status) as any;
  },
  async rejectReport(reportId: string, assignmentId: string, reason: string) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('reject_report', { p_report_id: reportId, p_assignment_id: assignmentId, p_reason: reason });
    return required(data, error, status) as any;
  },
  async signReport(reportId: string, assignmentId: string, payload: any = {}) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('sign_report', { p_report_id: reportId, p_assignment_id: assignmentId, p_payload: payload });
    return unwrap(required(data, error, status));
  },
  async setSignatureConfiguration(reportId: string, signatureFieldKey: string, signatureRole: 'sender' | 'receiver', requiredRole?: string | null, displayLabel?: string | null) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('set_report_signature_configuration', {
      p_report_id: reportId,
      p_signature_field_key: signatureFieldKey,
      p_signature_role: signatureRole,
      p_required_role: requiredRole?.trim() || null,
      p_display_label: displayLabel?.trim() || null,
    });
    return required(data, error, status) as any;
  },
  async resetSignatureConfiguration(reportId: string, signatureFieldKey: string) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('reset_report_signature_configuration', {
      p_report_id: reportId,
      p_signature_field_key: signatureFieldKey,
    });
    return required(data, error, status) as any;
  },
  async listNotifications(userId: string) {
    const { data, error, status } = await getSupabaseBrowserClient().from('notifications').select('*').eq('recipient_user_id', userId).order('created_at', { ascending: false });
    return required(data, error, status) as any[];
  },
  async markMyNotificationRead(notificationId: string) {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('mark_my_notification_read', { p_notification_id: notificationId });
    return required(data, error, status) as any;
  },
  async markMyNotificationsRead() {
    const { data, error, status } = await getSupabaseBrowserClient().rpc('mark_my_notifications_read');
    return required(data, error, status) as any;
  },
  async listReportComments(reportId: string) { const { data, error, status } = await getSupabaseBrowserClient().rpc('list_report_comments', { p_report_id: reportId }); return required(data, error, status) as any[]; },
  async addReportComment(reportId: string, message: string) { const { data, error, status } = await getSupabaseBrowserClient().rpc('add_report_comment', { p_report_id: reportId, p_message: message }); return required(data, error, status) as any[]; },
};
