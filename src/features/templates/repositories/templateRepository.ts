import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import { AppError } from '../../../lib/errors/errorHandling';
import { supabaseRequestError } from '../../../lib/errors/supabaseRequestError';
import { isAuthenticationFailure } from '../../workspace/workspaceRequestControl';
import { measureDev } from '../../../shared/devPerformance';
import type { RequestComment, WidgetTemplate } from '../../../types';
import { deserializeTemplateRow, serializeTemplateDraft } from '../mappers/templateSerializer';
const required = <T>(data: T | null, error: { message: string; code?: unknown; status?: unknown } | null, status?: number): T => { if (error) throw supabaseRequestError(error, status, 'Template operation could not be completed.'); if (data === null) throw new Error('No data returned'); return data; };
const unwrap = (value: any) => value?.template ?? value;

function approvalRpcResult<T>(data: T | null, error: { code?: unknown; message?: unknown; details?: unknown; hint?: unknown } | null, fallback: string, status?: number): T {
  if (error) {
    if (isAuthenticationFailure({ ...error, status })) throw supabaseRequestError(error, status, fallback);
    const text = [error.code, error.message, error.details, error.hint].filter(Boolean).map(String).join(' ').toUpperCase();
    if (text.includes('RETURN_REASON_REQUIRED')) throw new AppError('INVALID_INPUT', 'Please provide a reason for returning this template.');
    if (text.includes('REJECTION_REASON_REQUIRED')) throw new AppError('INVALID_INPUT', 'Please provide a reason for rejecting this template.');
    if (text.includes('TEMPLATE_RETURN_NOT_ALLOWED')) throw new AppError('FORBIDDEN', 'This template cannot be returned for revision.');
    if (text.includes('FORBIDDEN') || text.includes('PERMISSION_DENIED') || text.includes('42501')) {
      throw new AppError('FORBIDDEN', "You don't have permission to perform this action.");
    }
    throw new AppError('UNKNOWN', fallback);
  }
  if (data === null) throw new AppError('UNKNOWN', fallback);
  return data;
}

async function loadTemplateStructures(client: any, rows: any[]) {
  const ids = [...new Set(rows.map((row) => row.id))];
  if (!ids.length) return { sections: [], fields: [], tags: [] };
  const [s, f, t] = await Promise.all([
    client.from('template_sections').select('*').in('template_id', ids).order('display_order'),
    client.from('template_fields').select('*').in('template_id', ids).order('display_order'),
    client.from('template_tags').select('*').in('template_id', ids),
  ]);
  if (s.error) throw supabaseRequestError(s.error, s.status, 'Template sections could not be loaded.');
  if (f.error) throw supabaseRequestError(f.error, f.status, 'Template fields could not be loaded.');
  if (t.error) throw supabaseRequestError(t.error, t.status, 'Template tags could not be loaded.');
  return { sections: required(s.data, null) as any[], fields: required(f.data, null) as any[], tags: required(t.data, null) as any[] };
}

async function readTemplates(query: any): Promise<WidgetTemplate[]> {
  const client = getSupabaseBrowserClient();
  const result = await query;
  if (result.error) throw supabaseRequestError(result.error, result.status, 'Template records could not be loaded.');
  const rows = required(result.data, null) as any[];
  const { sections, fields, tags } = await loadTemplateStructures(client, rows);
  return rows.map((row) => deserializeTemplateRow(row, sections, fields, tags));
}

/** Collection visibility comes from three independent RLS queries; structural rows are fetched once for their union. */
export async function loadWorkspaceTemplateCollections(client: any, includePending: boolean): Promise<{
  approved: WidgetTemplate[]; owned: WidgetTemplate[]; pending: WidgetTemplate[];
}> {
  const [approvedResult, ownedResult, pendingResult] = await Promise.all([
    client.from('templates').select('*').eq('status', 'approved').order('updated_at', { ascending: false }),
    client.from('templates').select('*').order('updated_at', { ascending: false }),
    includePending ? client.from('templates').select('*').eq('status', 'pending_approval').order('submitted_at') : Promise.resolve({ data: [], error: null }),
  ]);
  const approvedRows = required(approvedResult.data, approvedResult.error, approvedResult.status) as any[];
  const ownedRows = required(ownedResult.data, ownedResult.error, ownedResult.status) as any[];
  const pendingRows = required(pendingResult.data, pendingResult.error, pendingResult.status) as any[];
  const union = [...new Map([...approvedRows, ...ownedRows, ...pendingRows].map((row) => [row.id, row])).values()];
  const { sections, fields, tags } = await measureDev('templateRepository.workspaceHydration', () => loadTemplateStructures(client, union));
  const mapRows = (rows: any[]) => rows.map((row) => deserializeTemplateRow(row, sections, fields, tags));
  return { approved: mapRows(approvedRows), owned: mapRows(ownedRows), pending: mapRows(pendingRows) };
}

function toSafeArchiveError(error: { code?: unknown; message?: unknown }, status?: number): Error {
  if (isAuthenticationFailure({ ...error, status })) return supabaseRequestError(error, status, 'Template operation could not be completed.');
  const code = String(error.code ?? '').toUpperCase();
  const message = String(error.message ?? '').toUpperCase();
  if (code === 'TEMPLATE_NOT_FOUND' || code === 'NOT_FOUND' || message.includes('TEMPLATE_NOT_FOUND')) {
    return new Error('This Template is no longer available.');
  }
  if (code === 'FORBIDDEN' || code === '42501' || message.includes('FORBIDDEN') || message.includes('PERMISSION_DENIED')) {
    return new Error("You don't have permission to delete this Template.");
  }
  return new Error("We couldn't delete this Template. Please try again.");
}

export const templateRepository = {
  getWorkspaceCollections(includePending: boolean) { return loadWorkspaceTemplateCollections(getSupabaseBrowserClient(), includePending); },
  async getCategories() { const { data, error, status } = await getSupabaseBrowserClient().from('categories').select('*').eq('status', 'Active').order('name'); return (required(data, error, status) as any[]).map((row) => ({ id: row.id, name: row.name, description: row.description, iconName: 'FolderKanban', status: row.status })); },
  async getTemplates() { const c = getSupabaseBrowserClient(); return readTemplates(c.from('templates').select('*').eq('status', 'approved').order('updated_at', { ascending: false })); },
  async getApprovedTemplates() { return this.getTemplates(); },
  async getMyTemplates() { const c = getSupabaseBrowserClient(); return readTemplates(c.from('templates').select('*').order('updated_at', { ascending: false })); },
  async getPendingApprovals() { const c = getSupabaseBrowserClient(); return readTemplates(c.from('templates').select('*').eq('status', 'pending_approval').order('submitted_at')); },
  async getTemplateById(id: string) { const c = getSupabaseBrowserClient(); const values = await readTemplates(c.from('templates').select('*').eq('id', id)); if (!values[0]) throw new Error('Template not found'); return values[0]; },
  async getTemplateComments(id: string): Promise<RequestComment[]> { const c = getSupabaseBrowserClient(); const { data, error, status } = await c.from('template_comments').select('*').eq('template_id', id).order('created_at'); return (required(data, error, status) as any[]).map((r) => ({ id: r.id, templateId: id, userId: r.author_user_id, userName: r.author_name, userRole: r.author_role_name, message: r.message, timestamp: r.created_at, delegationId: r.delegation_id ?? r.delegationId ?? null, delegatedByName: r.delegated_by_name ?? r.delegatedByName ?? null, authorityRoleName: r.authority_role_name ?? r.authorityRoleName ?? null })); },
  async saveDraft(template: WidgetTemplate) { const p = serializeTemplateDraft(template); const canonicalId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id || '') ? p.id : null; const { data, error, status } = await getSupabaseBrowserClient().rpc('save_template_draft', { p_template_id: canonicalId, p_name: p.name, p_description: p.description, p_category_id: p.categoryId, p_tags: p.tags, p_sections: p.sections, p_rules: p.rules, p_calculations: p.calculations, p_theme: p.theme, p_header_config: p.headerConfig, p_footer_config: p.footerConfig }); const snapshot = required(data, error, status) as any; return this.getTemplateById(snapshot?.template?.id ?? canonicalId!); },
  async submit(id: string) { const { data, error, status } = await getSupabaseBrowserClient().rpc('submit_template_for_approval', { p_template_id: id }); return unwrap(required(data, error, status)); },
  async claimReview(id: string) { const { data, error, status } = await getSupabaseBrowserClient().rpc('claim_template_review', { p_template_id: id }); return unwrap(approvalRpcResult(data, error, 'We could not claim this template review. Please try again.', status)); },
  async approve(id: string) { const { data, error, status } = await getSupabaseBrowserClient().rpc('approve_template', { p_template_id: id }); return unwrap(approvalRpcResult(data, error, 'We could not approve this template. Please try again.', status)); },
  async reject(id: string, reason: string) { const { data, error, status } = await getSupabaseBrowserClient().rpc('reject_template', { p_template_id: id, p_reason: reason }); return unwrap(approvalRpcResult(data, error, 'We could not reject this template. Please try again.', status)); },
  async returnForRevision(id: string, reason: string) { const { data, error, status } = await getSupabaseBrowserClient().rpc('return_template_for_revision', { p_template_id: id, p_reason: reason }); return unwrap(approvalRpcResult(data, error, 'We could not return this template. Please try again.', status)); },
  async archiveAny(id: string, reason: string): Promise<{ alreadyArchived: boolean }> {
    const { error, status } = await getSupabaseBrowserClient().rpc('archive_template_any', {
      p_template_id: id,
      p_reason: reason.trim() || null,
    });
    if (!error) return { alreadyArchived: false };
    const code = String(error.code ?? '').toUpperCase();
    const message = String(error.message ?? '').toUpperCase();
    if (code === 'TEMPLATE_ALREADY_ARCHIVED' || message.includes('TEMPLATE_ALREADY_ARCHIVED') || message.includes('ALREADY_ARCHIVED')) {
      return { alreadyArchived: true };
    }
    throw toSafeArchiveError(error, status);
  },
  async createRevision(id: string) { const { data, error, status } = await getSupabaseBrowserClient().rpc('create_template_revision', { p_template_id: id }); const value = unwrap(required(data, error, status)) as any; return this.getTemplateById(value.id); },
  async addComment(id: string, message: string) { const { data, error, status } = await getSupabaseBrowserClient().rpc('add_template_comment', { p_template_id: id, p_message: message }); return approvalRpcResult(data, error, 'We could not post this comment. Please try again.', status) as any; },
};
