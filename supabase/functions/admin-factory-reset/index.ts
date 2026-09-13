import { requireProtectedAdmin } from '../_shared/adminAuthorization.ts';
import { ApiError, databaseError, failure, preflight, success } from '../_shared/responses.ts';

const CONFIRM = 'RESET WIDGETFLOW DATA';
Deno.serve(async (request) => {
  try {
    const options = preflight(request); if (options) return options;
    if (request.method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Only POST is supported.');
    const { adminClient, userClient } = await requireProtectedAdmin(request);
    const body = await request.json() as { confirmation?: string; options?: Record<string, unknown> };
    if (body.confirmation !== CONFIRM) throw new ApiError(400, 'INVALID_INPUT', 'Explicit reset confirmation is required.');
    const { data, error } = await userClient.rpc('admin_execute_factory_reset', { p_confirmation: CONFIRM, p_options: body.options ?? {} });
    if (error) throw databaseError(error);
    const result = (data ?? {}) as Record<string, unknown>;
    const assets = Array.isArray(result.external_cleanup) ? result.external_cleanup as Array<Record<string, unknown>> : [];
    for (const asset of assets) {
      const bucket = String(asset.bucket_name ?? ''); const path = String(asset.object_path ?? ''); if (!bucket || !path) continue;
      const { error: removeError } = await adminClient.storage.from(bucket).remove([path]);
      if (removeError) throw new ApiError(502, 'INTERNAL_ERROR', 'Storage reconciliation failed.');
    }
    const purge = result.account_purge as { targets?: Array<{ auth_user_id?: string }> } | undefined;
    if (body.options?.delete_user_accounts === true && purge?.targets?.length) {
      for (const target of purge.targets) {
        const id = String(target.auth_user_id ?? '');
        if (!id) continue;
        const deleted = await adminClient.auth.admin.deleteUser(id);
        if (deleted.error && !/not found|does not exist|user_not_found/i.test(deleted.error.message)) throw new ApiError(502, 'INTERNAL_ERROR', 'Auth reconciliation failed.');
      }
      const { error: accountFinalizeError } = await userClient.rpc('admin_finalize_factory_reset_account_purge', { p_operation_id: result.operation_id });
      if (accountFinalizeError) throw databaseError(accountFinalizeError);
    }
    const operationId = typeof result.operation_id === 'string' ? result.operation_id : '';
    if (operationId) { const { data: finalized, error: finalError } = await userClient.rpc('admin_finalize_factory_reset', { p_operation_id: operationId }); if (finalError) throw databaseError(finalError); return success(request, finalized ?? result); }
    return success(request, result);
  } catch (error) { return failure(request, error); }
});
