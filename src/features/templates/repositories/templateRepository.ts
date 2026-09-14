import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { RequestComment, WidgetTemplate } from '../../../types';
import { deserializeTemplateRow, serializeTemplateDraft } from '../mappers/templateSerializer';

const required = <T>(data: T | null, error: { message: string } | null): T => { if (error) throw new Error(error.message); if (data === null) throw new Error('No data returned'); return data; };
const unwrap = (value: any) => value?.template ?? value;

async function readTemplates(query: any): Promise<WidgetTemplate[]> {
  const client = getSupabaseBrowserClient();
  const result = await query;
  if (result.error) throw new Error(`Template records could not be loaded: ${result.error.message}`);
  const rows = required(result.data, null) as any[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [s, f, t] = await Promise.all([
    client.from('template_sections').select('*').in('template_id', ids).order('display_order'),
    client.from('template_fields').select('*').in('template_id', ids).order('display_order'),
    client.from('template_tags').select('*').in('template_id', ids),
  ]);
  if (s.error) throw new Error(`Template sections could not be loaded: ${s.error.message}`);
  if (f.error) throw new Error(`Template fields could not be loaded: ${f.error.message}`);
  if (t.error) throw new Error(`Template tags could not be loaded: ${t.error.message}`);
  const sections = required(s.data, null); const fields = required(f.data, null); const tags = required(t.data, null);
  return rows.map((row) => deserializeTemplateRow(row, sections as any[], fields as any[], tags as any[]));
}

export const templateRepository = {
  async getCategories() { const { data, error } = await getSupabaseBrowserClient().from('categories').select('*').eq('status', 'Active').order('name'); return (required(data, error) as any[]).map((row) => ({ id: row.id, name: row.name, description: row.description, iconName: 'FolderKanban', status: row.status })); },
  async getTemplates() { const c = getSupabaseBrowserClient(); return readTemplates(c.from('templates').select('*').eq('status', 'approved').order('updated_at', { ascending: false })); },
  async getApprovedTemplates() { return this.getTemplates(); },
  async getMyTemplates() { const c = getSupabaseBrowserClient(); return readTemplates(c.from('templates').select('*').order('updated_at', { ascending: false })); },
  async getPendingApprovals() { const c = getSupabaseBrowserClient(); return readTemplates(c.from('templates').select('*').eq('status', 'pending_approval').order('submitted_at')); },
  async getTemplateById(id: string) { const c = getSupabaseBrowserClient(); const values = await readTemplates(c.from('templates').select('*').eq('id', id)); if (!values[0]) throw new Error('Template not found'); return values[0]; },
  async getTemplateComments(id: string): Promise<RequestComment[]> { const c = getSupabaseBrowserClient(); const { data, error } = await c.from('template_comments').select('*').eq('template_id', id).order('created_at'); return (required(data, error) as any[]).map((r) => ({ id: r.id, templateId: id, userId: r.author_user_id, userName: r.author_name, userRole: r.author_role_name, message: r.message, timestamp: r.created_at })); },
  async saveDraft(template: WidgetTemplate) { const p = serializeTemplateDraft(template); const { data, error } = await getSupabaseBrowserClient().rpc('save_template_draft', { p_template_id: p.id ?? null, p_name: p.name, p_description: p.description, p_category_id: p.categoryId, p_tags: p.tags, p_sections: p.sections, p_rules: p.rules, p_calculations: p.calculations, p_theme: p.theme, p_header_config: p.headerConfig, p_footer_config: p.footerConfig }); const snapshot = required(data, error) as any; return this.getTemplateById(snapshot?.template?.id ?? p.id!); },
  async submit(id: string) { const { data, error } = await getSupabaseBrowserClient().rpc('submit_template_for_approval', { p_template_id: id }); return unwrap(required(data, error)); },
  async claimReview(id: string) { const { data, error } = await getSupabaseBrowserClient().rpc('claim_template_review', { p_template_id: id }); return unwrap(required(data, error)); },
  async approve(id: string) { const { data, error } = await getSupabaseBrowserClient().rpc('approve_template', { p_template_id: id }); return unwrap(required(data, error)); },
  async reject(id: string, reason: string) { const { data, error } = await getSupabaseBrowserClient().rpc('reject_template', { p_template_id: id, p_reason: reason }); return unwrap(required(data, error)); },
  async returnForRevision(id: string, reason: string) { const { data, error } = await getSupabaseBrowserClient().rpc('return_template_for_revision', { p_template_id: id, p_reason: reason }); return unwrap(required(data, error)); },
  async createRevision(id: string) { const { data, error } = await getSupabaseBrowserClient().rpc('create_template_revision', { p_template_id: id }); const value = unwrap(required(data, error)) as any; return this.getTemplateById(value.id); },
  async addComment(id: string, message: string) { const { data, error } = await getSupabaseBrowserClient().rpc('add_template_comment', { p_template_id: id, p_message: message }); return required(data, error) as any; },
};
