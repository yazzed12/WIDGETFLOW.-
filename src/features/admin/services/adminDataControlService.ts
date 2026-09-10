import { httpRequest } from '../../../services/httpClient';
import { getSupabaseBrowserClient } from '../../../lib/supabase/client';

export interface AssetCleanupResult {
  status: string;
  requestedCount: number;
  selectedCount: number;
  deletedPhysicalObjects?: number;
  physicalAlreadyAbsent?: number;
  deletedMetadataRows?: number;
  operationId?: string;
  assets: Array<Record<string, unknown>>;
}

export interface DataControlDomain {
  domain_key: string;
  display_name: string;
  description: string;
  supports_search?: boolean;
  supports_bulk_selection?: boolean;
  protected?: boolean;
  danger_level?: string;
  count?: number;
  protected_count?: number;
}

export interface BrowseResult {
  rows: Array<Record<string, unknown>>;
  total_count: number;
  page: number;
  page_size: number;
  domain_key: string;
}

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabaseBrowserClient().rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const adminDataControlService = {
  getDomains: () => rpc<DataControlDomain[]>('admin_data_control_domains'),
  getSummary: () => rpc<DataControlDomain[]>('admin_data_control_summary'),
  browseDomain: (domainKey: string, page = 1, pageSize = 25, search?: string) => rpc<BrowseResult>('admin_data_control_browse', {
    p_domain_key: domainKey,
    p_page: page,
    p_page_size: pageSize,
    p_search: search || null,
    p_filters: {},
    p_sort: null,
  }),
  getAccountSummary: (userId: string) => rpc<Record<string, unknown>>('admin_account_data_summary', { p_user_id: userId }),
  getAccountReports: async (userId: string) => {
    const client = getSupabaseBrowserClient();
    const [created, received] = await Promise.all([
      client.from('reports').select('id,title,status,template_id,created_at,updated_at').eq('created_by_user_id', userId).order('updated_at', { ascending: false }),
      client.from('report_assignments').select('report_id,assignment_status,created_at').eq('recipient_user_id', userId).order('created_at', { ascending: false }),
    ]);
    if (created.error) throw new Error(created.error.message);
    if (received.error) throw new Error(received.error.message);
    return { created: (created.data ?? []) as Array<Record<string, unknown>>, received: (received.data ?? []) as Array<Record<string, unknown>> };
  },
  getAccountTemplates: async (userId: string) => {
    const { data, error } = await getSupabaseBrowserClient().from('templates').select('id,name,status,category_id,created_at,updated_at').eq('created_by_user_id', userId).order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<Record<string, unknown>>;
  },
  previewCleanup: (domainKey: string, recordIds?: string[], options: Record<string, unknown> = {}) => rpc<Record<string, unknown>>('admin_preview_data_cleanup', {
    p_domain_key: domainKey,
    p_record_ids: recordIds?.length ? recordIds : null,
    p_options: options,
  }),
  previewFactoryReset: (options: Record<string, unknown> = {}) => rpc<Record<string, unknown>>('admin_preview_factory_reset', { p_options: options }),
  executeFactoryReset: (confirmation: string, options: Record<string, unknown> = {}) => httpRequest<Record<string, unknown>>('/api/admin/data-control/system-reset', { method: 'POST', body: JSON.stringify({ confirmation, options }) }),
  previewAssetCleanup: (assetIds: string[]) => rpc<unknown[]>('admin_preview_asset_cleanup', { p_asset_ids: assetIds }),
  previewAccountCleanup: (userId: string, categories: string[]) => rpc<Record<string, unknown>>('admin_preview_account_data_cleanup', { p_user_id: userId, p_categories: categories }),
  executeAccountCleanup: (userId: string, categories: string[], confirmation: string, options: Record<string, unknown> = {}) => rpc<Record<string, unknown>>('admin_execute_account_data_cleanup', { p_user_id: userId, p_categories: categories, p_confirmation: confirmation, p_options: options }),
  executeCleanup: (domainKey: string, recordIds: string[], confirmation: string, options: Record<string, unknown> = {}) => rpc<Record<string, unknown>>('admin_execute_data_cleanup', {
    p_domain_key: domainKey,
    p_record_ids: recordIds,
    p_options: options,
    p_confirmation: confirmation,
  }),
  cleanupAssets(assetIds: string[], confirmation: string): Promise<AssetCleanupResult> {
    return httpRequest<AssetCleanupResult>('/api/admin/data-control/assets/cleanup', {
      method: 'POST',
      body: JSON.stringify({ assetIds, confirmation }),
    });
  },
};
