import { verifyCaller } from '../_shared/auth.ts';
import { requireProtectedAdmin } from '../_shared/adminAuthorization.ts';
import {
  ApiError,
  corsHeaders,
  databaseError,
  failure,
  preflight,
  success,
} from '../_shared/responses.ts';

const BUCKET = 'widgetflow-assets';
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_PURPOSES = new Set([
  'report_attachment',
  'template_asset',
]);

const TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VerifiedCaller = Awaited<ReturnType<typeof verifyCaller>>;

type CanonicalPrincipal = {
  userId: string;
  roleId: string;
  fullName: string | null;
  roleKey: string | null;
};

function extensionForMime(mime: string): string {
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'application/msword') return 'doc';

  if (
    mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }

  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';

  return 'jpg';
}

function safeFilename(value: unknown): string {
  const sanitized = String(value ?? 'asset')
    .replace(/[\u0000-\u001f\u007f"\\/]/g, '_')
    .slice(0, 180);

  return sanitized || 'asset';
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const first = value[0];

    if (first && typeof first === 'object') {
      return first as Record<string, unknown>;
    }

    return null;
  }

  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return null;
}

function extractBase64Payload(value: string, expectedMime: string): string {
  const dataUrlMatch = value.match(
    /^data:([^;]+);base64,([\s\S]*)$/,
  );

  if (dataUrlMatch) {
    const declaredMime = dataUrlMatch[1].trim().toLowerCase();

    if (declaredMime !== expectedMime) {
      throw new ApiError(
        400,
        'INVALID_INPUT',
        'The file MIME type does not match the encoded payload.',
      );
    }

    return dataUrlMatch[2];
  }

  return value;
}

function decodeBase64(value: string): Uint8Array {
  try {
    return Uint8Array.from(
      atob(value),
      (character) => character.charCodeAt(0),
    );
  } catch {
    throw new ApiError(
      400,
      'INVALID_INPUT',
      'The uploaded file payload is invalid.',
    );
  }
}

async function exactObjectExists(
  client: any,
  bucket: string,
  objectPath: string,
): Promise<boolean> {
  const separatorIndex = objectPath.lastIndexOf('/');

  const folder =
    separatorIndex < 0
      ? ''
      : objectPath.slice(0, separatorIndex);

  const name =
    separatorIndex < 0
      ? objectPath
      : objectPath.slice(separatorIndex + 1);

  const { data, error } = await client.storage
    .from(bucket)
    .list(folder, {
      search: name,
      limit: 100,
    });

  if (error) {
    throw new ApiError(
      502,
      'INTERNAL_ERROR',
      'Storage verification failed.',
    );
  }

  return Boolean(
    data?.some((entry: { name?: string }) => entry.name === name),
  );
}

async function getCanonicalPrincipal(
  verified: VerifiedCaller,
): Promise<CanonicalPrincipal> {
  const { data, error } = await verified.userClient.rpc(
    'current_principal',
  );

  if (error) {
    throw databaseError(error);
  }

  const row = firstRecord(data);

  const userId =
    typeof row?.user_id === 'string'
      ? row.user_id
      : null;

  const roleId =
    typeof row?.role_id === 'string'
      ? row.role_id
      : null;

  if (
    !userId ||
    !roleId ||
    !UUID_RE.test(userId) ||
    !UUID_RE.test(roleId)
  ) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'An active WidgetFlow profile is required.',
    );
  }

  return {
    userId,
    roleId,
    fullName:
      typeof row?.full_name === 'string'
        ? row.full_name
        : null,
    roleKey:
      typeof row?.role_key === 'string'
        ? row.role_key
        : null,
  };
}

async function hasAnyPermission(
  verified: VerifiedCaller,
  roleId: string,
  permissionKeys: string[],
): Promise<boolean> {
  const { data, error } = await verified.adminClient
    .from('role_permissions')
    .select('permission_key')
    .eq('role_id', roleId)
    .in('permission_key', permissionKeys);

  if (error) {
    throw databaseError(error);
  }

  return Boolean(data?.length);
}

async function requireReportAttachmentWriteAccess(
  verified: VerifiedCaller,
  principal: CanonicalPrincipal,
  reportId?: string,
): Promise<void> {
  /*
   * Preserve the established report upload permission vocabulary:
   * reports.create OR reports.edit_draft.
   *
   * Permission alone is not enough. The report must also:
   * - be visible through its canonical RLS contract,
   * - belong to this WidgetFlow profile,
   * - currently be a Draft.
   *
   * A returned report is moved back to Draft by the canonical
   * return_report RPC, so returned-correction uploads are still covered.
   */
  const permitted = await hasAnyPermission(
    verified,
    principal.roleId,
    reportId ? ['reports.edit_draft'] : ['reports.create'],
  );

  if (!permitted) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'You are not authorized to upload attachments to reports.',
    );
  }

  if (!reportId) return;
  const { data: report, error } = await verified.userClient
    .from('reports')
    .select('id,created_by_user_id,status')
    .eq('id', reportId)
    .maybeSingle();

  if (error) {
    throw databaseError(error);
  }

  if (
    !report ||
    report.created_by_user_id !== principal.userId ||
    String(report.status).toLowerCase() !== 'draft'
  ) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'This report cannot accept attachments from the current user.',
    );
  }
}

async function requireTemplateAssetWriteAccess(
  verified: VerifiedCaller,
  principal: CanonicalPrincipal,
  templateId: string,
): Promise<void> {
  const permitted = await hasAnyPermission(
    verified,
    principal.roleId,
    [
      'templates.create',
      'templates.edit_draft',
    ],
  );

  if (!permitted) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'You are not authorized to upload template assets.',
    );
  }

  const { data: template, error } = await verified.userClient
    .from('templates')
    .select('id,created_by_user_id,status')
    .eq('id', templateId)
    .maybeSingle();

  if (error) {
    throw databaseError(error);
  }

  const status = String(template?.status ?? '').toLowerCase();

  if (
    !template ||
    template.created_by_user_id !== principal.userId ||
    !['draft', 'rejected'].includes(status)
  ) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'This template cannot accept assets from the current user.',
    );
  }
}

async function canReadReport(
  verified: VerifiedCaller,
  reportId: string,
): Promise<boolean> {
  /*
   * Do NOT reproduce report recipient/owner rules here.
   *
   * The authenticated Supabase client is intentionally used so
   * public.reports RLS and private.current_user_can_read_report(...)
   * remain authoritative.
   */
  const { data, error } = await verified.userClient
    .from('reports')
    .select('id')
    .eq('id', reportId)
    .maybeSingle();

  if (error) {
    throw databaseError(error);
  }

  return Boolean(data);
}

async function canReadTemplate(
  verified: VerifiedCaller,
  templateId: string,
): Promise<boolean> {
  /*
   * The Templates RLS contract already represents:
   * - owner visibility,
   * - approved-template visibility,
   * - current approval/reviewer visibility.
   *
   * Therefore GET must not reduce access to creator-only.
   */
  const { data, error } = await verified.userClient
    .from('templates')
    .select('id')
    .eq('id', templateId)
    .maybeSingle();

  if (error) {
    throw databaseError(error);
  }

  return Boolean(data);
}

Deno.serve(async (request) => {
  try {
    const options = preflight(request);

    if (options) {
      return options;
    }

    const verified = await verifyCaller(request);

    /*
     * Resolve the WidgetFlow profile identity separately from
     * the Supabase Auth identity.
     *
     * verified.user.id remains appropriate for physical Storage
     * object paths.
     *
     * principal.userId is used for business-domain profile FKs.
     */
    const principal = await getCanonicalPrincipal(verified);

    const url = new URL(request.url);

    let postBody: Record<string, unknown> | null = null;

    if (request.method === 'POST') {
      postBody =
        await request.json() as Record<string, unknown>;

      const body = postBody;

      if (body.action === 'link-report-asset') {
        const assetId = String(body.assetId ?? ''), reportId = String(body.reportId ?? '');
        if (!UUID_RE.test(assetId) || !UUID_RE.test(reportId)) throw new ApiError(400, 'INVALID_INPUT', 'Asset and report ids must be valid UUIDs.');
        const p = await getCanonicalPrincipal(verified);
        if (!(await hasAnyPermission(verified, p.roleId, ['reports.create', 'reports.edit_draft']))) throw new ApiError(403, 'FORBIDDEN', 'Report attachment permission is required.');
        const { data: report } = await verified.userClient.from('reports').select('id,created_by_user_id,status').eq('id', reportId).maybeSingle();
        if (!report || report.created_by_user_id !== p.userId || String(report.status).toLowerCase() !== 'draft') throw new ApiError(403, 'FORBIDDEN', 'Only an owned draft report can receive a staged attachment.');
        const { data: asset } = await verified.adminClient.from('asset_metadata').select('id,bucket_name,asset_purpose,lifecycle_state,owner_user_id,linked_report_id,linked_template_id').eq('id', assetId).maybeSingle();
        if (!asset || asset.bucket_name !== BUCKET || asset.asset_purpose !== 'report_attachment' || asset.lifecycle_state !== 'active' || asset.owner_user_id !== p.userId || asset.linked_report_id || asset.linked_template_id) throw new ApiError(409, 'INVALID_INPUT', 'The staged asset cannot be linked.');
        const { data: updated, error: updateError } = await verified.adminClient.from('asset_metadata').update({ linked_report_id: reportId }).eq('id', assetId).eq('owner_user_id', p.userId).is('linked_report_id', null).is('linked_template_id', null).select('id').maybeSingle();
        if (updateError || !updated) throw new ApiError(409, 'INVALID_INPUT', 'The staged asset was already linked or is unavailable.');
        return success(request, { assetId, reportId });
      }

      /*
       * ==========================================================
       * PROTECTED ADMIN ASSET CLEANUP
       * ==========================================================
       */
      if (body.action === 'cleanup') {
        const adminAuth =
          await requireProtectedAdmin(request);

        const cleanupClient = adminAuth.userClient;

        const rawIds =
          Array.isArray(body.assetIds)
            ? body.assetIds
            : [];

        if (!rawIds.length) {
          throw new ApiError(
            400,
            'INVALID_INPUT',
            'Cleanup confirmation and assets are required.',
          );
        }

        if (
          rawIds.some(
            (id) =>
              typeof id !== 'string' ||
              !UUID_RE.test(id),
          )
        ) {
          throw new ApiError(
            400,
            'INVALID_INPUT',
            'Every asset id must be a valid UUID.',
          );
        }

        if (
          body.confirmation !==
          'DELETE ORPHAN ASSETS'
        ) {
          throw new ApiError(
            400,
            'INVALID_INPUT',
            'Cleanup confirmation and assets are required.',
          );
        }

        const ids = rawIds as string[];

        const {
          data: preview,
          error: previewError,
        } = await cleanupClient.rpc(
          'admin_preview_asset_cleanup',
          {
            p_asset_ids: ids,
          },
        );

        if (previewError) {
          throw databaseError(previewError);
        }

        const assets =
          Array.isArray(preview)
            ? preview as Array<Record<string, unknown>>
            : [];

        const blocked = assets.filter((asset) => {
          const classification = String(
            asset.classification ?? '',
          ).toUpperCase();

          return ![
            'PHYSICAL_DELETE_REQUIRED',
            'SAFE_METADATA_DELETE',
          ].includes(classification);
        });

        if (blocked.length) {
          return success(request, {
            status: 'blocked',
            requestedCount: ids.length,
            selectedCount: ids.length,
            assets: blocked,
          });
        }

        let deletedPhysicalObjects = 0;

        for (const asset of assets) {
          const classification = String(
            asset.classification ?? '',
          ).toUpperCase();

          if (
            classification !==
            'PHYSICAL_DELETE_REQUIRED'
          ) {
            continue;
          }

          if (
            !asset.bucket_name ||
            !asset.object_path
          ) {
            continue;
          }

          const bucket =
            String(asset.bucket_name);

          const objectPath =
            String(asset.object_path);

          const existsBefore =
            await exactObjectExists(
              verified.adminClient,
              bucket,
              objectPath,
            );

          if (!existsBefore) {
            continue;
          }

          const { error: removeError } =
            await verified.adminClient.storage
              .from(bucket)
              .remove([objectPath]);

          if (removeError) {
            throw new ApiError(
              502,
              'INTERNAL_ERROR',
              'Storage cleanup failed.',
            );
          }

          const existsAfter =
            await exactObjectExists(
              verified.adminClient,
              bucket,
              objectPath,
            );

          if (existsAfter) {
            throw new ApiError(
              502,
              'INTERNAL_ERROR',
              'Storage cleanup could not be verified.',
            );
          }

          deletedPhysicalObjects += 1;
        }

        const {
          data: finalized,
          error: finalizeError,
        } = await cleanupClient.rpc(
          'admin_finalize_asset_metadata_cleanup',
          {
            p_asset_ids: ids,
            p_confirmation:
              'DELETE ORPHAN ASSET METADATA',
            p_options: {},
          },
        );

        if (finalizeError) {
          throw databaseError(finalizeError);
        }

        return success(request, {
          status: 'completed',
          requestedCount: ids.length,
          selectedCount: ids.length,
          deletedPhysicalObjects,
          deletedMetadataRows:
            (finalized as any)?.deleted_count ??
            ids.length,
          assets,
        });
      }
    }

    /*
     * ==========================================================
     * GENERAL REPORT / TEMPLATE ASSET UPLOAD
     * ==========================================================
     */
    if (
      request.method === 'POST' &&
      postBody &&
      typeof postBody.base64Data === 'string'
    ) {
      const body = postBody as {
        filename?: string;
        mimeType?: string;
        base64Data?: string;
        purpose?: string;
        linkedTemplateId?: string;
        linkedReportId?: string;
      };

      const mime =
        String(body.mimeType ?? '')
          .trim()
          .toLowerCase();

      if (
        !TYPES.has(mime) ||
        !body.base64Data
      ) {
        throw new ApiError(
          400,
          'INVALID_INPUT',
          'Unsupported or missing file.',
        );
      }

      const purpose =
        String(body.purpose ?? '');

      if (!ALLOWED_PURPOSES.has(purpose)) {
        throw new ApiError(
          400,
          'INVALID_INPUT',
          'Asset purpose must be report_attachment or template_asset.',
        );
      }

      if (
        purpose === 'report_attachment' &&
        (
          body.linkedTemplateId
        )
      ) {
        throw new ApiError(
          400,
          'INVALID_INPUT',
          'Report attachments require exactly one report link.',
        );
      }

      if (
        purpose === 'template_asset' &&
        (
          !body.linkedTemplateId ||
          body.linkedReportId
        )
      ) {
        throw new ApiError(
          400,
          'INVALID_INPUT',
          'Template assets require exactly one template link.',
        );
      }

      const linkedId =
        purpose === 'report_attachment'
          ? body.linkedReportId
          : body.linkedTemplateId;

      if (purpose === 'template_asset' && (typeof linkedId !== 'string' || !UUID_RE.test(linkedId))) {
        throw new ApiError(
          400,
          'INVALID_INPUT',
          'Linked resource id must be a valid UUID.',
        );
      }
      if (purpose === 'report_attachment' && linkedId !== undefined && (typeof linkedId !== 'string' || !UUID_RE.test(linkedId))) throw new ApiError(400, 'INVALID_INPUT', 'Linked report id must be a valid UUID.');

      /*
       * Authorization happens BEFORE Storage upload.
       */
      if (purpose === 'report_attachment') {
        await requireReportAttachmentWriteAccess(verified, principal, typeof linkedId === 'string' ? linkedId : undefined);
      } else {
        await requireTemplateAssetWriteAccess(
          verified,
          principal,
          linkedId,
        );
      }

      const encoded =
        extractBase64Payload(
          body.base64Data,
          mime,
        );

      /*
       * Check encoded size BEFORE atob() to avoid creating
       * another oversized decoded allocation.
       */
      const maxEncodedLength =
        Math.ceil(MAX_BYTES / 3) * 4;

      if (
        encoded.length === 0 ||
        encoded.length > maxEncodedLength
      ) {
        throw new ApiError(
          400,
          'INVALID_INPUT',
          'Files must be 10 MiB or smaller.',
        );
      }

      if (
        !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
      ) {
        throw new ApiError(
          400,
          'INVALID_INPUT',
          'The uploaded file payload is invalid.',
        );
      }

      const data = decodeBase64(encoded);

      if (data.byteLength > MAX_BYTES) {
        throw new ApiError(
          400,
          'INVALID_INPUT',
          'Files must be 10 MiB or smaller.',
        );
      }

      /*
       * Physical Storage paths remain scoped by the current
       * authenticated Auth UUID.
       *
       * Business metadata ownership uses principal.userId.
       */
      const objectPath =
        `${purpose}/${verified.user.id}/` +
        `${crypto.randomUUID()}.${extensionForMime(mime)}`;

      const {
        error: uploadError,
      } = await verified.adminClient.storage
        .from(BUCKET)
        .upload(
          objectPath,
          data,
          {
            contentType: mime,
            upsert: false,
          },
        );

      if (uploadError) {
        throw new ApiError(
          502,
          'INTERNAL_ERROR',
          'Asset upload failed.',
        );
      }

      const {
        data: asset,
        error: metadataError,
      } = await verified.adminClient
        .from('asset_metadata')
        .insert({
          bucket_name: BUCKET,
          object_path: objectPath,
          asset_purpose: purpose,

          owner_user_id: principal.userId,

          owner_name_snapshot:
            principal.fullName,

          owner_role_key_snapshot:
            principal.roleKey,

          linked_template_id:
            purpose === 'template_asset'
              ? linkedId
              : null,

          linked_report_id:
            purpose === 'report_attachment' && linkedId
              ? linkedId
              : null,

          original_filename:
            body.filename ?? null,

          mime_type: mime,
          byte_size: data.byteLength,
          lifecycle_state: 'active',
          is_immutable: false,
        })
        .select(
          'id,original_filename,mime_type',
        )
        .single();

      if (metadataError || !asset) {
        /*
         * DB registration failed after physical upload.
         * Remove ONLY the exact object created by this request.
         */
        await verified.adminClient.storage
          .from(BUCKET)
          .remove([objectPath]);

        throw databaseError(metadataError);
      }

      return success(request, {
        id: asset.id,
        filename: asset.original_filename,
        mimeType: asset.mime_type,
        url: asset.id,
      });
    }

    /*
     * ==========================================================
     * PROTECTED GENERAL ASSET READ
     * ==========================================================
     */
    if (request.method === 'GET') {
      const assetId =
        url.pathname
          .split('/')
          .filter(Boolean)
          .pop();

      if (
        !assetId ||
        !UUID_RE.test(assetId)
      ) {
        throw new ApiError(
          400,
          'INVALID_INPUT',
          'Asset id must be a valid UUID.',
        );
      }

      /*
       * Service role is used only to resolve physical metadata.
       * Authorization is performed below before bytes are read.
       */
      const {
        data: asset,
        error: metadataError,
      } = await verified.adminClient
        .from('asset_metadata')
        .select(
          [
            'id',
            'bucket_name',
            'object_path',
            'asset_purpose',
            'mime_type',
            'original_filename',
            'owner_user_id',
            'linked_report_id',
            'linked_template_id',
            'lifecycle_state',
          ].join(','),
        )
        .eq('id', assetId)
        .maybeSingle();

      if (metadataError) {
        throw databaseError(metadataError);
      }

      if (!asset) {
        throw new ApiError(
          404,
          'TARGET_NOT_FOUND',
          'Asset not found.',
        );
      }

      /*
       * Generic gateway must never become an alternate way
       * to fetch signature/private-special-purpose assets.
       */
      if (
        asset.bucket_name !== BUCKET ||
        !ALLOWED_PURPOSES.has(
          String(asset.asset_purpose),
        ) ||
        String(asset.lifecycle_state)
          .toLowerCase() !== 'active'
      ) {
        throw new ApiError(
          404,
          'TARGET_NOT_FOUND',
          'Asset not found.',
        );
      }

      /*
       * Owner comparison uses permanent WidgetFlow profile ID,
       * not the Supabase Auth UUID.
       */
      let allowed =
        asset.owner_user_id ===
        principal.userId;

      /*
       * Canonical report READ access:
       * let report RLS/current_user_can_read_report decide.
       */
      if (
        !allowed &&
        asset.linked_report_id
      ) {
        allowed = await canReadReport(
          verified,
          asset.linked_report_id,
        );
      }

      /*
       * Canonical template READ access:
       * let approved/owner/reviewer RLS decide.
       */
      if (
        !allowed &&
        asset.linked_template_id
      ) {
        allowed = await canReadTemplate(
          verified,
          asset.linked_template_id,
        );
      }

      if (!allowed) {
        throw new ApiError(
          403,
          'FORBIDDEN',
          'You are not authorized to access this asset.',
        );
      }

      const {
        data: object,
        error: downloadError,
      } = await verified.adminClient.storage
        .from(asset.bucket_name)
        .download(asset.object_path);

      if (
        downloadError ||
        !object
      ) {
        throw new ApiError(
          404,
          'TARGET_NOT_FOUND',
          'Asset content is unavailable.',
        );
      }

      return new Response(
        object,
        {
          status: 200,
          headers: {
            ...corsHeaders(request),

            'Content-Type':
              asset.mime_type ||
              'application/octet-stream',

            'Content-Disposition':
              `inline; filename="${safeFilename(
                asset.original_filename,
              )}"`,

            'Cache-Control':
              'private, no-store',
          },
        },
      );
    }

    throw new ApiError(
      405,
      'METHOD_NOT_ALLOWED',
      'Unsupported method.',
    );
  } catch (error) {
    return failure(request, error);
  }
});
