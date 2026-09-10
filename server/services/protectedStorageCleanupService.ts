import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../middleware/errorHandler.js';
import { createServiceRoleClient } from './supabaseServiceRoleClient.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_CONFIRMATION = 'DELETE ORPHAN ASSETS';
const FINALIZE_CONFIRMATION = 'DELETE ORPHAN ASSET METADATA';
const SUPPORTED_BUCKET = 'widgetflow-signatures';
const SUPPORTED_PURPOSE = 'signature_profile';
const BLOCKED = new Set(['IMMUTABLE', 'STILL_REFERENCED', 'HISTORICAL_REPORT_REFERENCE', 'UNSUPPORTED_ASSET_PURPOSE', 'UNSUPPORTED_BUCKET']);

type PreviewAsset = {
  asset_id?: string; id?: string;
  bucket_name?: string; object_path?: string;
  asset_purpose?: string; classification?: string;
};

function userClient(authorization: string): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new AppError('Supabase server configuration is unavailable.', 503, 'SUPABASE_CONFIGURATION');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: authorization } } });
}

function previewAssets(data: unknown): PreviewAsset[] {
  if (Array.isArray(data)) return data as PreviewAsset[];
  if (data && typeof data === 'object') {
    const value = data as Record<string, unknown>;
    for (const key of ['assets', 'data', 'results']) if (Array.isArray(value[key])) return value[key] as PreviewAsset[];
  }
  return [];
}

function normalizeIds(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0) throw new AppError('assetIds must be a non-empty array.', 400, 'INVALID_INPUT');
  if (input.length > 1000) throw new AppError('A maximum of 1000 assets may be selected.', 400, 'SELECTION_TOO_LARGE');
  const ids = input.map((value) => String(value));
  if (ids.some((id) => !UUID_RE.test(id))) throw new AppError('Every assetId must be a valid UUID.', 400, 'INVALID_INPUT');
  return [...new Set(ids)];
}

async function preview(client: SupabaseClient, ids: string[]): Promise<PreviewAsset[]> {
  const { data, error } = await client.rpc('admin_preview_asset_cleanup', { p_asset_ids: ids });
  if (error) {
    if (error.message.includes('ADMIN_REQUIRED')) throw new AppError('Protected Admin authorization required.', 403, 'ADMIN_REQUIRED');
    throw new AppError('Asset cleanup preview failed.', 502, 'PREVIEW_FAILED');
  }
  const assets = previewAssets(data);
  if (assets.length !== ids.length) throw new AppError('Asset cleanup preview did not resolve the complete selection.', 409, 'PREVIEW_SELECTION_MISMATCH');
  const requested = new Set(ids);
  const returned = assets.map(assetId);
  if (returned.some((id) => !requested.has(id)) || new Set(returned).size !== requested.size) {
    throw new AppError('Asset cleanup preview returned an unexpected selection.', 409, 'PREVIEW_SELECTION_MISMATCH');
  }
  return assets;
}

function assetId(asset: PreviewAsset): string { return String(asset.asset_id ?? asset.id ?? ''); }

async function exactObjectExists(admin: SupabaseClient, bucket: string, objectPath: string): Promise<boolean> {
  const slash = objectPath.lastIndexOf('/');
  const folder = slash >= 0 ? objectPath.slice(0, slash) : '';
  const filename = slash >= 0 ? objectPath.slice(slash + 1) : objectPath;
  const { data, error } = await admin.storage.from(bucket).list(folder, { search: filename, limit: 100 });
  if (error) throw new AppError('Storage verification failed.', 502, 'STORAGE_VERIFY_FAILED');
  return Boolean(data?.some((entry) => entry.name === filename));
}

export async function cleanupOrphanAssets(input: { assetIds: unknown; confirmation: unknown; authorization?: string }) {
  const ids = normalizeIds(input.assetIds);
  if (input.confirmation !== PUBLIC_CONFIRMATION) throw new AppError('Explicit cleanup confirmation is required.', 400, 'CONFIRMATION_REQUIRED');
  if (!input.authorization || !/^Bearer\s+.+$/i.test(input.authorization)) throw new AppError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');

  const client = userClient(input.authorization);
  const initial = await preview(client, ids);
  const blockers = initial.filter((asset) => BLOCKED.has(String(asset.classification ?? '').toUpperCase()));
  if (blockers.length) {
    return { status: 'blocked', requestedCount: ids.length, selectedCount: ids.length, assets: blockers.map((asset) => ({ assetId: assetId(asset), status: String(asset.classification ?? 'BLOCKED').toUpperCase() })), blockers: blockers.map((asset) => ({ assetId: assetId(asset), classification: asset.classification })) };
  }

  const results = new Map<string, { assetId: string; bucketName?: string; objectPath?: string; physicalDeleted: boolean; physicalAlreadyAbsent: boolean; metadataDeleted: boolean; status: string }>();
  const physical = initial.filter((asset) => String(asset.classification ?? '').toUpperCase() === 'PHYSICAL_DELETE_REQUIRED');
  const metadataOnly = initial.filter((asset) => String(asset.classification ?? '').toUpperCase() === 'SAFE_METADATA_DELETE');
  // The service-role client is needed only when an object must be removed.
  // Metadata-only cleanup stays entirely on the authenticated user client.
  const admin = physical.length > 0 ? createServiceRoleClient() : undefined;
  for (const asset of initial) {
    const id = assetId(asset);
    const bucket = asset.bucket_name;
    const objectPath = asset.object_path;
    if (String(asset.classification ?? '').toUpperCase() === 'SAFE_METADATA_DELETE') results.set(id, { assetId: id, physicalDeleted: false, physicalAlreadyAbsent: true, metadataDeleted: false, status: 'SAFE_METADATA_DELETE' });
    else if (String(asset.classification ?? '').toUpperCase() === 'PHYSICAL_DELETE_REQUIRED') {
      if (bucket !== SUPPORTED_BUCKET || asset.asset_purpose !== SUPPORTED_PURPOSE || !objectPath) throw new AppError('Asset storage scope is unsupported.', 409, 'UNSUPPORTED_STORAGE_SCOPE');
      if (!admin) throw new AppError('Storage cleanup client is unavailable.', 503, 'STORAGE_CONFIGURATION');
      if (await exactObjectExists(admin, bucket, objectPath)) {
        const { error } = await admin.storage.from(bucket).remove([objectPath]);
        if (error) throw new AppError('Physical asset deletion failed; metadata was preserved.', 502, 'STORAGE_DELETE_FAILED');
        if (await exactObjectExists(admin, bucket, objectPath)) throw new AppError('Physical asset deletion could not be verified; metadata was preserved.', 502, 'STORAGE_VERIFY_FAILED');
        results.set(id, { assetId: id, bucketName: bucket, objectPath, physicalDeleted: true, physicalAlreadyAbsent: false, metadataDeleted: false, status: 'PHYSICAL_DELETED' });
      } else results.set(id, { assetId: id, bucketName: bucket, objectPath, physicalDeleted: false, physicalAlreadyAbsent: true, metadataDeleted: false, status: 'PHYSICAL_ALREADY_ABSENT' });
    }
  }
  if (physical.length + metadataOnly.length !== ids.length) throw new AppError('One or more assets have an unsupported cleanup classification.', 409, 'UNSUPPORTED_CLASSIFICATION');

  const second = await preview(client, ids);
  const unsafe = second.filter((asset) => String(asset.classification ?? '').toUpperCase() !== 'SAFE_METADATA_DELETE');
  if (unsafe.length) return { status: 'reconciliation_required', requestedCount: ids.length, selectedCount: ids.length, assets: [...results.values()], blockers: unsafe.map((asset) => ({ assetId: assetId(asset), classification: asset.classification })), warning: 'Storage objects may already have been removed; metadata was not finalized.' };

  const { data: finalized, error: finalizeError } = await client.rpc('admin_finalize_asset_metadata_cleanup', { p_asset_ids: ids, p_confirmation: FINALIZE_CONFIRMATION, p_options: {} });
  if (finalizeError) throw new AppError('Asset metadata finalization failed after Storage cleanup.', 502, 'METADATA_FINALIZE_FAILED');
  const finalizedCount = typeof finalized === 'object' && finalized ? Number((finalized as Record<string, unknown>).deleted_count ?? (finalized as Record<string, unknown>).deletedCount ?? ids.length) : ids.length;
  for (const result of results.values()) { result.metadataDeleted = true; result.status = 'completed'; }
  return { status: 'completed', requestedCount: ids.length, selectedCount: ids.length, deletedPhysicalObjects: [...results.values()].filter((r) => r.physicalDeleted).length, physicalAlreadyAbsent: [...results.values()].filter((r) => r.physicalAlreadyAbsent).length, deletedMetadataRows: finalizedCount, assets: [...results.values()], operationId: typeof finalized === 'object' && finalized ? (finalized as Record<string, unknown>).operation_id ?? (finalized as Record<string, unknown>).operationId : undefined };
}
