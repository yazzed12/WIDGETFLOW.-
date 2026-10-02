import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { mapTemplateControlStates, mapTemplateInsightDetail, mapTemplateInsightsResponse, mapTemplateUsagePeriodSummary } from './templateInsightsMapper';
import { isSupportedTemplateInsightsRange } from './templateInsightsDateRange';
import { templateRepository } from '../templates/repositories/templateRepository';
import type { TemplateInsightDetail, TemplateInsightDetailOptions, TemplateInsightsOptions, TemplateInsightsResponse, TemplateUsagePeriodSummary, TemplateControlState } from './templateInsightsTypes';

const SAFE_INSIGHTS_ERROR = 'Insights data is unavailable.';
const SAFE_CONTROL_ERROR = 'Template controls are unavailable. Please try again.';

function ensureRange(startAt: string, endAt: string): void {
  if (!isSupportedTemplateInsightsRange(startAt, endAt)) throw new Error(SAFE_INSIGHTS_ERROR);
}

export const templateInsightsRepository = {
  async getTemplateUsageInsights(options: TemplateInsightsOptions): Promise<TemplateInsightsResponse> {
    ensureRange(options.startAt, options.endAt);
    if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100 || !Number.isInteger(options.offset) || options.offset < 0) {
      throw new Error(SAFE_INSIGHTS_ERROR);
    }
    const { data, error } = await getSupabaseBrowserClient().rpc('get_template_usage_insights', {
      p_start_at: options.startAt,
      p_end_at: options.endAt,
      p_category_id: options.categoryId,
      p_search: options.search,
      p_usage_state: options.usageState,
      p_sort: options.sort,
      p_sort_direction: options.sortDirection,
      p_limit: options.limit,
      p_offset: options.offset,
    });
    if (error) throw new Error(SAFE_INSIGHTS_ERROR);
    try {
      return mapTemplateInsightsResponse(data);
    } catch {
      throw new Error(SAFE_INSIGHTS_ERROR);
    }
  },

  async getTemplateUsageInsightDetail(templateId: string, options: TemplateInsightDetailOptions): Promise<TemplateInsightDetail> {
    ensureRange(options.startAt, options.endAt);
    const { data, error } = await getSupabaseBrowserClient().rpc('get_template_usage_insight_detail', {
      p_template_id: templateId,
      p_start_at: options.startAt,
      p_end_at: options.endAt,
    });
    if (error) throw new Error(SAFE_INSIGHTS_ERROR);
    try {
      return mapTemplateInsightDetail(data);
    } catch {
      throw new Error(SAFE_INSIGHTS_ERROR);
    }
  },

  async getTemplateUsagePeriodSummary(options: TemplateInsightDetailOptions & { categoryId: string | null }): Promise<TemplateUsagePeriodSummary> {
    ensureRange(options.startAt, options.endAt);
    const { data, error } = await getSupabaseBrowserClient().rpc('get_template_usage_period_summary', {
      p_start_at: options.startAt,
      p_end_at: options.endAt,
      p_category_id: options.categoryId,
    });
    if (error) throw new Error(SAFE_INSIGHTS_ERROR);
    try {
      return mapTemplateUsagePeriodSummary(data);
    } catch {
      throw new Error(SAFE_INSIGHTS_ERROR);
    }
  },

  async getTemplateControlStates(templateIds: string[]): Promise<TemplateControlState[]> {
    if (templateIds.length === 0 || templateIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
      if (templateIds.length === 0) return [];
      throw new Error(SAFE_CONTROL_ERROR);
    }
    const { data, error } = await getSupabaseBrowserClient().rpc('get_template_insights_control_states', { p_template_ids: templateIds });
    if (error) throw new Error(SAFE_CONTROL_ERROR);
    try {
      return mapTemplateControlStates(data);
    } catch {
      throw new Error(SAFE_CONTROL_ERROR);
    }
  },

  async pauseTemplate(templateId: string, reason: string): Promise<void> {
    const { error } = await getSupabaseBrowserClient().rpc('pause_template_from_insights', {
      p_template_id: templateId,
      p_reason: reason.trim() || null,
    });
    if (error) throw new Error("We couldn't pause this Template. Please try again.");
  },

  async resumeTemplate(templateId: string): Promise<void> {
    const { error } = await getSupabaseBrowserClient().rpc('resume_template_from_insights', { p_template_id: templateId });
    if (error) throw new Error("We couldn't resume this Template. Please try again.");
  },

  async createTemplateRevision(templateId: string) {
    const { data, error } = await getSupabaseBrowserClient().rpc('create_template_revision_from_insights', { p_template_id: templateId });
    if (error) throw new Error("We couldn't create a Draft revision for this Template. Please try again.");
    const payload = Array.isArray(data) ? data[0] : data;
    const source = typeof payload === 'string' ? { id: payload } : payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const nested = source.template && typeof source.template === 'object' ? source.template as Record<string, unknown> : {};
    const draft = source.draft && typeof source.draft === 'object' ? source.draft as Record<string, unknown> : {};
    const createdId = [source.id, source.template_id, source.templateId, source.new_template_id, source.draft_template_id, source.draft_id, nested.id, nested.template_id, draft.id, draft.template_id]
      .find((candidate): candidate is string => typeof candidate === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate));
    if (!createdId) throw new Error("We couldn't create a Draft revision for this Template. Please try again.");
    try {
      return await templateRepository.getTemplateById(createdId);
    } catch {
      throw new Error("We couldn't open the Draft revision. Please try again.");
    }
  },

  async deleteTemplate(templateId: string, reason: string): Promise<{ alreadyArchived: boolean }> {
    try {
      return await templateRepository.archiveAny(templateId, reason);
    } catch (cause) {
      throw cause instanceof Error ? cause : new Error("We couldn't delete this Template. Please try again.");
    }
  },
};
