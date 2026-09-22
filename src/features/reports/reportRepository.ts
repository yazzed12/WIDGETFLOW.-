import { getSupabaseBrowserClient } from '../../lib/supabase/client';

const unwrap = (data: any) => data?.report ?? data;
const required = (data: any, error: any) => {
  if (error) {
    const detail = [error.message, error.code && `code=${error.code}`, error.details && `details=${error.details}`, error.hint && `hint=${error.hint}`].filter(Boolean).join(' | ');
    console.warn('[WidgetFlow Supabase Report RPC]', { message: error.message, code: error.code, details: error.details, hint: error.hint });
    throw new Error(detail || 'Supabase Report operation failed');
  }
  if (data == null) throw new Error('No report data returned'); return data;
};

export const reportRepository = {
  async listRecipientDirectory() {
    const { data, error } = await getSupabaseBrowserClient().rpc('list_report_recipient_directory');
    return required(data, error) as any[];
  },
  async list() {
    const c = getSupabaseBrowserClient();
    const { data, error } = await c.from('reports').select('*, report_values(*), report_assignments(*), report_signature_events(*), report_signature_assignments(*), report_signature_configurations(*), template_versions(id,schema_snapshot)').order('updated_at', { ascending: false });
    return required(data, error) as any[];
  },
  async get(id: string) {
    const c = getSupabaseBrowserClient();
    const result = await c.from('reports').select('*, report_values(*), report_assignments(*), report_signature_events(*), report_signature_assignments(*), report_signature_configurations(*), report_audit_events(*), template_versions(id,schema_snapshot)').eq('id', id).maybeSingle();
    const { data, error } = result;
    return required(data, error) as any;
  },
  async create(templateId: string, values: Record<string, any> = {}, title?: string) {
    const { data, error } = await getSupabaseBrowserClient().rpc('create_report_from_template', { p_template_id: templateId, p_title: title ?? null, p_values: values });
    return unwrap(required(data, error));
  },
  async saveDraft(reportId: string, values: Record<string, any>, title: string) {
    const { data, error } = await getSupabaseBrowserClient().rpc('save_report_draft', { p_report_id: reportId, p_title: title, p_values: values });
    return unwrap(required(data, error));
  },
  async complete(reportId: string, values: Record<string, any>, title?: string) {
    const { data, error } = await getSupabaseBrowserClient().rpc('complete_report', { p_report_id: reportId, p_title: title ?? null, p_values: values });
    return unwrap(required(data, error));
  },
  async send(reportId: string, recipientIds: string[], note?: string, signatureMappings: Array<{ recipientUserId: string; signatureFieldKey: string }> = []) {
    const { data, error } = await getSupabaseBrowserClient().rpc('send_report', { p_report_id: reportId, p_recipient_user_ids: recipientIds, p_note: note ?? null, p_signature_mappings: signatureMappings });
    return required(data, error) as any;
  },
  async returnReport(reportId: string, assignmentId: string, reason: string) {
    const { data, error } = await getSupabaseBrowserClient().rpc('return_report', { p_report_id: reportId, p_assignment_id: assignmentId, p_reason: reason });
    return unwrap(required(data, error));
  },
  async rejectReport(reportId: string, assignmentId: string, reason: string) {
    const { data, error } = await getSupabaseBrowserClient().rpc('reject_report', { p_report_id: reportId, p_assignment_id: assignmentId, p_reason: reason });
    return required(data, error) as any;
  },
  async signReport(reportId: string, assignmentId: string, payload: any = {}) {
    const { data, error } = await getSupabaseBrowserClient().rpc('sign_report', { p_report_id: reportId, p_assignment_id: assignmentId, p_payload: payload });
    return unwrap(required(data, error));
  },
  async setSignatureConfiguration(reportId: string, signatureFieldKey: string, signatureRole: 'sender' | 'receiver', requiredRole?: string | null, displayLabel?: string | null) {
    const { data, error } = await getSupabaseBrowserClient().rpc('set_report_signature_configuration', {
      p_report_id: reportId,
      p_signature_field_key: signatureFieldKey,
      p_signature_role: signatureRole,
      p_required_role: requiredRole?.trim() || null,
      p_display_label: displayLabel?.trim() || null,
    });
    return required(data, error) as any;
  },
  async resetSignatureConfiguration(reportId: string, signatureFieldKey: string) {
    const { data, error } = await getSupabaseBrowserClient().rpc('reset_report_signature_configuration', {
      p_report_id: reportId,
      p_signature_field_key: signatureFieldKey,
    });
    return required(data, error) as any;
  },
  async listNotifications(userId: string) {
    const { data, error } = await getSupabaseBrowserClient().from('notifications').select('*').eq('recipient_user_id', userId).order('created_at', { ascending: false });
    return required(data, error) as any[];
  },
  async markMyNotificationRead(notificationId: string) {
    const { data, error } = await getSupabaseBrowserClient().rpc('mark_my_notification_read', { p_notification_id: notificationId });
    return required(data, error) as any;
  },
  async markMyNotificationsRead() {
    const { data, error } = await getSupabaseBrowserClient().rpc('mark_my_notifications_read');
    return required(data, error) as any;
  },
  async listReportComments(reportId: string) { const { data, error } = await getSupabaseBrowserClient().rpc('list_report_comments', { p_report_id: reportId }); return required(data, error) as any[]; },
  async addReportComment(reportId: string, message: string) { const { data, error } = await getSupabaseBrowserClient().rpc('add_report_comment', { p_report_id: reportId, p_message: message }); return required(data, error) as any[]; },
};
