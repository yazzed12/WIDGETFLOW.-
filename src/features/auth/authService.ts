import type { PermissionKey } from '../../shared/permissionCatalog.js';
import { AuthFlowError } from './authErrors.js';
import {
  supabaseAuthRepository,
  type AuthRepository,
  type AuthStateListener,
  type SignInResult,
} from './supabaseAuthRepository.js';
import type {
  AuthPrincipal,
  CurrentPrincipalRow,
  LoginCredentials,
  ProfileStatus,
} from './authTypes.js';

const PROFILE_STATUSES = new Set<ProfileStatus>(['Active', 'Inactive', 'Resigned', 'Terminated']);
const ROLE_TYPES = new Set(['System', 'Custom']);
const GOVERNANCE_LEVELS = new Set(['Employee', 'Manager', 'Director', 'None']);

function isCurrentPrincipalRow(value: unknown): value is CurrentPrincipalRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.user_id === 'string' &&
    typeof row.full_name === 'string' &&
    typeof row.email === 'string' &&
    typeof row.profile_code === 'string' &&
    /^[A-Z]{2}-[0-9]{3,}-[0-9]{4}$/.test(row.profile_code) &&
    typeof row.profile_status === 'string' &&
    PROFILE_STATUSES.has(row.profile_status as ProfileStatus) &&
    typeof row.role_id === 'string' &&
    typeof row.role_key === 'string' &&
    typeof row.role_name === 'string' &&
    typeof row.role_type === 'string' && ROLE_TYPES.has(row.role_type) &&
    typeof row.governance_level === 'string' && GOVERNANCE_LEVELS.has(row.governance_level) &&
    typeof row.role_active === 'boolean' &&
    typeof row.role_protected === 'boolean' &&
    Array.isArray(row.effective_permissions) &&
    row.effective_permissions.every((permission) => typeof permission === 'string')
  );
}

export function mapCurrentPrincipal(value: unknown): AuthPrincipal {
  if (!isCurrentPrincipalRow(value)) throw new AuthFlowError('AUTH_UNAVAILABLE');
  return {
    userId: value.user_id,
    fullName: value.full_name,
    email: value.email,
    profileCode: value.profile_code,
    profileStatus: value.profile_status,
    roleId: value.role_id,
    roleKey: value.role_key,
    roleName: value.role_name,
    roleType: value.role_type,
    governanceLevel: value.governance_level,
    roleActive: value.role_active,
    roleProtected: value.role_protected,
    effectivePermissions: [...value.effective_permissions] as PermissionKey[],
  };
}

function isInvalidCredentials(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; status?: unknown };
  return candidate.code === 'invalid_credentials' || candidate.status === 400;
}

export function createAuthService(repository: AuthRepository) {
  return {
    async signIn(credentials: LoginCredentials): Promise<SignInResult> {
      try {
        return await repository.signIn({
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        });
      } catch (error) {
        if (isInvalidCredentials(error)) throw new AuthFlowError('INVALID_CREDENTIALS');
        if (error instanceof Error && error.message.includes('Missing required browser configuration')) {
          throw new AuthFlowError('AUTH_CONFIGURATION', error);
        }
        throw new AuthFlowError('AUTH_UNAVAILABLE', error);
      }
    },

    async resolvePrincipal(): Promise<AuthPrincipal> {
      let row: CurrentPrincipalRow | null;
      try {
        row = await repository.currentPrincipal();
      } catch (error) {
        throw new AuthFlowError('AUTH_UNAVAILABLE', error);
      }
      if (!row) throw new AuthFlowError('ACCOUNT_NOT_CONFIGURED');

      const principal = mapCurrentPrincipal(row);
      if (principal.profileStatus !== 'Active' || !principal.roleActive) {
        throw new AuthFlowError('ACCOUNT_INACTIVE');
      }
      return principal;
    },

    async currentSession() {
      try {
        return await repository.currentSession();
      } catch (error) {
        throw new AuthFlowError('AUTH_UNAVAILABLE', error);
      }
    },

    async signOut(): Promise<void> {
      try {
        await repository.signOut();
      } catch (error) {
        throw new AuthFlowError('AUTH_UNAVAILABLE', error);
      }
    },

    onAuthStateChange(listener: AuthStateListener): () => void {
      return repository.onAuthStateChange(listener);
    },
  };
}

export const authService = createAuthService(supabaseAuthRepository);
