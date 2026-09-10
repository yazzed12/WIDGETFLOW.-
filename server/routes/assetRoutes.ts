import { Router } from 'express';
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../middleware/errorHandler.js';
import { authorizationService } from '../services/authorizationService.js';
import { createServiceRoleClient } from '../services/supabaseServiceRoleClient.js';

export const assetRouter = Router();
const SIGNATURE_BUCKET = 'widgetflow-signatures';
const GENERAL_BUCKET = String(process.env.SUPABASE_ASSET_BUCKET || '').trim();
const MAX_ASSET_BYTES = 10 * 1024 * 1024;

function requireBearer(req: any): string {
  const value = req.headers.authorization;
  if (!value || !/^Bearer\s+.+$/i.test(value)) throw new AppError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
  return value;
}
function requestClient(authorization: string): SupabaseClient {
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new AppError('Supabase asset gateway is unavailable.', 503, 'SUPABASE_CONFIGURATION');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: authorization } } });
}
function decodeBase64(input: unknown): Buffer {
  const raw = String(input || '').replace(/^data:[^;]+;base64,/, '');
  if (!raw) throw new AppError('No asset data provided.', 400, 'ASSET_DATA_REQUIRED');
  const bytes = Buffer.from(raw, 'base64');
  if (!bytes.length) throw new AppError('Asset data is empty.', 400, 'ASSET_DATA_REQUIRED');
  if (bytes.length > MAX_ASSET_BYTES) throw new AppError('File size exceeds maximum limit of 10MB.', 400, 'ASSET_TOO_LARGE');
  return bytes;
}
export function verifySignatureImageBinary(buffer: Buffer, mimeType?: string): { valid: boolean; format?: string; error?: string } {
  if (!buffer?.length) return { valid: false, error: 'Empty signature file data.' };
  if (buffer.length > 5 * 1024 * 1024) return { valid: false, error: 'Signature file size exceeds maximum limit of 5MB.' };
  const declared = String(mimeType || '').toLowerCase(); const head = buffer.subarray(0, 512).toString('utf8').toLowerCase();
  if (head.includes('<svg') || head.includes('<?xml') || head.includes('<html') || head.includes('<script')) return { valid: false, error: 'Vector SVG, HTML, and script contents are forbidden.' };
  if (buffer.length >= 8 && buffer.readUInt32BE(0) === 0x89504e47 && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) return { valid: !declared || declared === 'image/png', format: 'image/png', error: declared && declared !== 'image/png' ? 'Declared MIME does not match PNG.' : undefined };
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { valid: !declared || declared === 'image/jpeg', format: 'image/jpeg', error: declared && declared !== 'image/jpeg' ? 'Declared MIME does not match JPEG.' : undefined };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return { valid: !declared || declared === 'image/webp', format: 'image/webp', error: declared && declared !== 'image/webp' ? 'Declared MIME does not match WebP.' : undefined };
  return { valid: false, error: 'Binary image signature mismatch.' };
}
function extensionForMime(mime: string): string {
  if (mime === 'application/pdf') return 'pdf'; if (mime === 'application/msword') return 'doc'; if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'; if (mime === 'image/png') return 'png'; if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'; if (mime === 'image/webp') return 'webp'; return 'bin';
}
function bucketForPurpose(purpose: string): string { if (purpose === 'signature_profile') return SIGNATURE_BUCKET; if (!GENERAL_BUCKET) throw new AppError('Supabase asset bucket is not configured.', 503, 'SUPABASE_ASSET_BUCKET_REQUIRED'); return GENERAL_BUCKET; }
async function insertMetadata(client: SupabaseClient, args: { bucket: string; objectPath: string; purpose: string; user: any; filename: string; mime: string; bytes: Buffer; linkedReportId?: string; linkedTemplateId?: string }) {
  const { data, error } = await client.from('asset_metadata').insert({ bucket_name: args.bucket, object_path: args.objectPath, asset_purpose: args.purpose, owner_user_id: args.user.id, owner_name_snapshot: args.user.name || args.user.email || args.user.id, owner_role_key_snapshot: args.user.roleKey || 'unknown', linked_report_id: args.linkedReportId || null, linked_template_id: args.linkedTemplateId || null, original_filename: args.filename, mime_type: args.mime, byte_size: args.bytes.length, content_hash: crypto.createHash('sha256').update(args.bytes).digest('hex'), lifecycle_state: 'active', metadata: {} }).select('*').single();
  if (error || !data) throw new AppError('Asset metadata registration failed.', 502, 'ASSET_METADATA_WRITE_FAILED'); return data;
}
async function uploadCanonical(req: any, purpose: 'report_attachment' | 'template_asset' | 'signature_profile', permissions: string[]) {
  const authorization = requireBearer(req); authorizationService.requireAnyPermission(req.user, permissions as any); const body = req.body || {}; const bytes = decodeBase64(body.base64Data); const mime = String(body.mimeType || 'application/octet-stream').toLowerCase();
  const allowed = purpose === 'signature_profile' ? ['image/png', 'image/jpeg', 'image/webp'] : ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/msword', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowed.includes(mime)) throw new AppError('Unsupported file format.', 400, 'UNSUPPORTED_FILE_TYPE');
  const bucket = bucketForPurpose(purpose); const assetId = crypto.randomUUID(); const objectPath = `${purpose}/${req.user.id}/${assetId}.${extensionForMime(mime)}`; const storage = createServiceRoleClient();
  const { error: uploadError } = await storage.storage.from(bucket).upload(objectPath, bytes, { contentType: mime, upsert: false });
  if (uploadError) throw new AppError('Asset storage upload failed.', 502, 'ASSET_STORAGE_WRITE_FAILED');
  try { const metadata = await insertMetadata(storage, { bucket, objectPath, purpose, user: req.user, filename: String(body.filename || `${assetId}.${extensionForMime(mime)}`), mime, bytes, linkedReportId: body.linkedReportId, linkedTemplateId: body.linkedTemplateId }); return { id: metadata.id, filename: metadata.original_filename, mimeType: metadata.mime_type, url: `/api/assets/${metadata.id}` }; } catch (error) { await storage.storage.from(bucket).remove([objectPath]); throw error; }
}
assetRouter.post('/upload', async (req, res, next) => { try { res.json({ success: true, data: await uploadCanonical(req, 'report_attachment', ['reports.create', 'reports.edit_draft']) }); } catch (e) { next(e); } });
assetRouter.post('/template-upload', async (req, res, next) => { try { res.json({ success: true, data: await uploadCanonical(req, 'template_asset', ['templates.create', 'templates.edit_draft']) }); } catch (e) { next(e); } });
assetRouter.post('/signature-upload', async (req, res, next) => { try {
  if (!req.body?.attestationAccepted) throw new AppError('Explicit user attestation required.', 400, 'ATTESTATION_REQUIRED');
  const authorization = requireBearer(req); authorizationService.requirePermission(req.user, 'signature_profile.use');
  const bytes = decodeBase64(req.body?.base64Data); const check = verifySignatureImageBinary(bytes, req.body?.mimeType);
  if (!check.valid || check.format !== 'image/png') throw new AppError(check.error || 'Signature uploads must be PNG images.', 400, 'INVALID_SIGNATURE_IMAGE');
  const objectPath = `signatures/${req.user.id}/${crypto.randomUUID()}.png`; const client = requestClient(authorization);
  const { error: uploadError } = await client.storage.from(SIGNATURE_BUCKET).upload(objectPath, bytes, { contentType: 'image/png', upsert: false });
  if (uploadError) throw new AppError('Signature asset storage upload failed.', 502, 'ASSET_STORAGE_WRITE_FAILED');
  try {
    const { data: assetId, error: registerError } = await client.rpc('register_my_signature_asset', { p_object_path: objectPath, p_original_filename: String(req.body?.filename || 'signature.png'), p_byte_size: bytes.length, p_content_hash: crypto.createHash('sha256').update(bytes).digest('hex'), p_extraction_version: 'signature_extract_v1' });
    if (registerError || !assetId) throw new AppError('Signature asset registration failed.', 502, 'ASSET_METADATA_WRITE_FAILED');
    res.json({ success: true, data: { id: assetId, filename: String(req.body?.filename || 'signature.png'), mimeType: 'image/png', url: `/api/assets/${assetId}` } });
  } catch (error) { await client.storage.from(SIGNATURE_BUCKET).remove([objectPath]); throw error; }
} catch (e) { next(e); } });
assetRouter.get('/:id', async (req, res, next) => { try {
  const authorization = requireBearer(req); const caller = req.user; const client = requestClient(authorization); const metadataClient = createServiceRoleClient(); const { data: asset, error } = await metadataClient.from('asset_metadata').select('*').eq('id', req.params.id).eq('lifecycle_state', 'active').maybeSingle();
  if (error || !asset) throw new AppError('Asset record not found.', 404, 'ASSET_NOT_FOUND'); let allowed = asset.owner_user_id === caller?.id;
  if (asset.linked_report_id) { const { data } = await client.from('reports').select('id').eq('id', asset.linked_report_id).maybeSingle(); allowed ||= Boolean(data); }
  if (!asset.linked_report_id && asset.asset_purpose === 'report_attachment') {
    const { data: values } = await client.from('report_values').select('report_id').filter('value->>attachmentId', 'eq', asset.id);
    for (const value of values || []) { const { data: report } = await client.from('reports').select('id').eq('id', value.report_id).maybeSingle(); if (report) { allowed = true; break; } }
  }
  if (asset.linked_template_id) { const { data } = await client.from('templates').select('id').eq('id', asset.linked_template_id).maybeSingle(); allowed ||= Boolean(data); }
  if (asset.asset_purpose === 'signature_profile' && asset.owner_user_id !== caller?.id) { const { data } = await client.from('report_signature_events').select('report_id').eq('signature_asset_id', asset.id).limit(1); if (data?.length) { const { data: report } = await client.from('reports').select('id').eq('id', data[0].report_id).maybeSingle(); allowed ||= Boolean(report); } }
  if (!allowed) throw new AppError('Forbidden: access to asset denied.', 403, 'FORBIDDEN'); const storage = createServiceRoleClient(); const { data: file, error: downloadError } = await storage.storage.from(asset.bucket_name).download(asset.object_path); if (downloadError || !file) throw new AppError('Asset file is unavailable.', 404, 'ASSET_FILE_NOT_FOUND'); res.setHeader('Content-Type', asset.mime_type); res.setHeader('Content-Length', String(asset.byte_size)); res.end(Buffer.from(await file.arrayBuffer()));
} catch (e) { next(e); } });
