import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import { AppError } from '../../../lib/errors/errorHandling';

type RpcArgs = Record<string, unknown>;

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function invoke(functionName: string, body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await getSupabaseBrowserClient().functions.invoke(functionName, { body });
  if (error) {
    let message = error.message;
    let code = (error as any).code;
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json();
        code = payload?.error?.code || code;
        message = payload?.error?.message || message;
      } catch {
        // The Edge Function still returned a safe generic SDK error.
      }
    }
    throw new AppError(String(code ?? 'UNKNOWN').toUpperCase() as any, message);
  }
  if (!data?.success) throw new AppError(String(data?.error?.code || 'UNKNOWN').toUpperCase() as any, String(data?.error?.message || 'The operation could not be completed.'));
  return data.data;
}

async function rpc(functionName: string, args: RpcArgs): Promise<unknown> {
  const { data, error } = await getSupabaseBrowserClient().rpc(functionName, args);
  throwIfError(error);
  return data;
}

export const adminMutationRepository = {
  createUser: (body: Record<string, unknown>) => invoke('admin-create-user', body),
  createAdmin: (body: Record<string, unknown>) => invoke('admin-create-admin', body),
  resetPassword: (targetUserId: string, newPassword: string) => invoke('admin-reset-password', { targetUserId, newPassword }),
  setUserStatus: (targetUserId: string, status: string) => invoke('admin-set-user-status', { targetUserId, status }),
  changeUserRole: (targetUserId: string, newRoleId: string, reason?: string) =>
    invoke('admin-change-user-role', { targetUserId, newRoleId, reason }),
  createRole: (input: { name: string; description: string; governanceLevel: string; isActive: boolean; permissions: string[] }) =>
    rpc('admin_create_custom_role', { p_name: input.name, p_description: input.description,
      p_governance_level: input.governanceLevel, p_is_active: input.isActive, p_permission_keys: input.permissions }),
  updateRole: (id: string, input: { name: string; description: string; governanceLevel: string; isActive: boolean; permissions: string[] }) =>
    rpc('admin_update_role', { p_role_id: id, p_name: input.name, p_description: input.description,
      p_governance_level: input.governanceLevel, p_is_active: input.isActive, p_permission_keys: input.permissions }),
  createCategory: (input: { name: string; description: string; status: string }) =>
    rpc('admin_create_category', { p_name: input.name, p_description: input.description, p_status: input.status }),
  updateCategory: (id: string, input: { name: string; description: string; status: string }) =>
    rpc('admin_update_category', { p_category_id: id, p_name: input.name, p_description: input.description, p_status: input.status }),
  createPack: (input: { name: string; description: string; categoryId?: string | null; structure: unknown[]; items: unknown[] }) =>
    rpc('admin_create_standard_pack', { p_name: input.name, p_description: input.description,
      p_category_id: input.categoryId ?? null, p_structure: input.structure, p_items: input.items }),
  savePackDraft: (id: string, input: { name: string; description: string; categoryId?: string | null; structure: unknown[]; items: unknown[] }) =>
    rpc('admin_save_standard_pack_draft', { p_pack_id: id, p_name: input.name, p_description: input.description,
      p_category_id: input.categoryId ?? null, p_structure: input.structure, p_items: input.items }),
  createPackVersion: (id: string) => rpc('admin_create_standard_pack_version', { p_pack_id: id }),
  publishPack: (id: string, versionId: string) => rpc('admin_publish_standard_pack', { p_pack_id: id, p_version_id: versionId }),
  setPackStatus: (id: string, status: 'disabled' | 'published' | 'archived') =>
    rpc('admin_set_standard_pack_status', { p_pack_id: id, p_status: status }),
};
