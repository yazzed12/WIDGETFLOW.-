import type { SupabaseClient, User } from 'npm:@supabase/supabase-js@2.102.0';
import { verifyCaller } from './auth.ts';
import { ApiError } from './responses.ts';

export type AdminPrincipal = {
  userId: string;
  fullName: string;
  email: string;
};

export type AuthorizedAdmin = {
  principal: AdminPrincipal;
  authUser: User;
  adminClient: SupabaseClient;
  userClient: SupabaseClient;
};

type PrincipalRow = {
  user_id: string;
  full_name: string;
  email: string;
  profile_status: string;
  role_key: string;
  role_type: string;
  role_active: boolean;
  role_protected: boolean;
};

export async function requireProtectedAdmin(request: Request): Promise<AuthorizedAdmin> {
  const verified = await verifyCaller(request);
  const { data, error } = await verified.userClient.rpc('current_principal');
  if (error) throw new ApiError(403, 'FORBIDDEN', 'Application identity could not be resolved.');

  const principal = (Array.isArray(data) ? data[0] : data) as PrincipalRow | undefined;
  if (!principal) throw new ApiError(403, 'FORBIDDEN', 'No WidgetFlow profile is assigned.');
  if (principal.profile_status !== 'Active' || !principal.role_active) {
    throw new ApiError(403, 'ACCOUNT_INACTIVE', 'This WidgetFlow account is not active.');
  }
  if (
    principal.role_type !== 'System' ||
    principal.role_key.trim().toLowerCase() !== 'admin' ||
    !principal.role_protected
  ) {
    throw new ApiError(403, 'ADMIN_REQUIRED', 'An active protected Admin is required.');
  }
  if (principal.user_id !== verified.user.id) {
    throw new ApiError(403, 'FORBIDDEN', 'The authenticated identity did not match its profile.');
  }

  return {
    principal: {
      userId: principal.user_id,
      fullName: principal.full_name,
      email: principal.email,
    },
    authUser: verified.user,
    adminClient: verified.adminClient,
    userClient: verified.userClient,
  };
}
