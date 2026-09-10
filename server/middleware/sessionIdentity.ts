import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import type { SecurityConfig } from '../config/securityConfig.js';
import { readCookie } from '../auth/cookieService.js';
import { sessionService } from '../auth/sessionService.js';
import { AppError } from './errorHandler.js';
import { createClient } from '@supabase/supabase-js';
import type { ServerUser } from '../types/index.js';

type CanonicalPrincipalRow = {
  user_id: string;
  full_name: string;
  email: string;
  profile_status: string;
  role_id: string;
  role_key: string;
  role_name: string;
  role_type: 'System' | 'Custom';
  governance_level: 'Employee' | 'Manager' | 'Director' | 'None';
  role_active: boolean;
  role_protected: boolean;
  effective_permissions: string[];
};

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

function canonicalPrincipalToServerUser(
  row: CanonicalPrincipalRow
): ServerUser {
  const legacyRole =
    row.role_type === 'System' &&
      ['Employee', 'Manager', 'Director', 'Admin'].includes(row.role_name)
      ? (row.role_name as ServerUser['legacyRole'])
      : 'Employee';

  return {
    id: row.user_id,
    name: row.full_name,
    email: row.email,
    role: row.role_name,
    legacyRole,
    roleId: row.role_id,
    roleKey: row.role_key,
    roleType: row.role_type,
    governanceLevel: row.governance_level,
    permissions:
      (row.effective_permissions || []) as ServerUser['permissions'],
    roleActive: Boolean(row.role_active),
    roleProtected: Boolean(row.role_protected),
    status: row.profile_status as ServerUser['status'],
    avatarInitials: initials(row.full_name),
    avatarBg: 'bg-indigo-600',
    department: '',
  };
}

async function authenticateSupabaseBearer(authorization: string) {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (process.env.NODE_ENV !== 'production') {
    console.info('[AUTH TRACE SERVER]', {
      supabaseUrlConfigured: Boolean(url),
      supabasePublishableKeyConfigured: Boolean(key),
    });
  }

  if (!url || !key) {
    throw new AppError(
      'Authentication is required.',
      401,
      'AUTHENTICATION_REQUIRED'
    );
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const token = authorization.replace(/^Bearer\s+/i, '');

  const { data, error } = await client.auth.getUser(token);

  if (process.env.NODE_ENV !== 'production') {
    console.info('[AUTH TRACE SERVER]', {
      supabaseTokenVerificationError: error
        ? {
          name: error.name,
          message: error.message,
        }
        : null,
      supabaseUserPresent: Boolean(data.user),
    });
  }

  if (error || !data.user) {
    throw new AppError(
      'Authentication is required.',
      401,
      'AUTHENTICATION_REQUIRED'
    );
  }

  const { data: principalData, error: principalError } =
    await client.rpc('current_principal');

  const principal = (
    Array.isArray(principalData)
      ? principalData[0]
      : principalData
  ) as CanonicalPrincipalRow | null;

  if (process.env.NODE_ENV !== 'production') {
    console.info('[AUTH TRACE SERVER]', {
      canonicalRoleKey: principal?.role_key,
      canonicalPermissionCount:
        principal?.effective_permissions?.length ?? 0,
      canonicalHasReportsCreate: Boolean(
        principal?.effective_permissions?.includes('reports.create')
      ),
      canonicalHasReportsEditDraft: Boolean(
        principal?.effective_permissions?.includes(
          'reports.edit_draft'
        )
      ),
      canonicalProfileFound: Boolean(principal),
      canonicalRoleFound: Boolean(principal?.role_id),
      profileActive: principal?.profile_status === 'Active',
      roleActive: Boolean(principal?.role_active),
      canonicalPrincipalError: principalError
        ? {
          code: principalError.code,
          message: principalError.message,
        }
        : null,
    });
  }

  if (
    principalError ||
    !principal ||
    principal.profile_status !== 'Active' ||
    !principal.role_active
  ) {
    throw new AppError(
      'Account is unavailable.',
      403,
      'ACCOUNT_UNAVAILABLE'
    );
  }

  const serverUser = canonicalPrincipalToServerUser(principal);

  if (process.env.NODE_ENV !== 'production') {
    console.info('[AUTH TRACE SERVER]', {
      mappedRoleKey: serverUser.roleKey,
      mappedPermissionCount: serverUser.permissions.length,
      mappedHasReportsCreate:
        serverUser.permissions.includes('reports.create'),
      mappedHasReportsEditDraft:
        serverUser.permissions.includes('reports.edit_draft'),
    });
  }

  return serverUser;
}

export function createSessionIdentityMiddleware(
  config: SecurityConfig
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ) => {
    try {
      const authorization = req.headers.authorization;

      const authScheme =
        authorization
          ?.match(/^([^\s]+)/)?.[1]
          ?.toLowerCase();

      const trace = process.env.NODE_ENV !== 'production';

      if (trace) {
        console.info('[AUTH TRACE SERVER]', {
          path: req.originalUrl,
          authorizationHeaderPresent: Boolean(authorization),
          authorizationScheme:
            authScheme === 'bearer' ? 'Bearer' : 'none',
          cookieHeaderPresent: Boolean(req.headers.cookie),
          reqUserInitiallyPresent: Boolean(req.user),
        });
      }

      const token = readCookie(
        req,
        config.sessionCookie.name
      );

      if (authorization) {
        if (trace) {
          console.info('[AUTH TRACE SERVER]', {
            authBranch: 'bearer',
            bearerVerificationAttempted: true,
            legacyCookiePresent: Boolean(token),
          });
        }

        if (!/^Bearer\s+.+$/i.test(authorization)) {
          throw new AppError(
            'Authentication is required.',
            401,
            'AUTHENTICATION_REQUIRED'
          );
        }

        try {
          req.user =
            await authenticateSupabaseBearer(
              authorization
            );

          if (trace) {
            console.info('[AUTH TRACE SERVER]', {
              bearerVerificationSucceeded: true,
              authorizationUserResolved: true,
            });
          }
        } catch (error: any) {
          if (trace) {
            console.info('[AUTH TRACE SERVER]', {
              bearerVerificationSucceeded: false,
              error: {
                name: error?.name,
                code: error?.code,
                message: error?.message,
              },
            });
          }

          throw error;
        }
      } else if (token) {
        if (trace) {
          console.info('[AUTH TRACE SERVER]', {
            authBranch: 'cookie',
          });
        }

        const authenticated =
          sessionService.authenticate(token);

        req.user = authenticated.user;
        req.authSessionId =
          authenticated.session.id;
        req.authSessionToken = token;
      } else {
        if (trace) {
          console.info('[AUTH TRACE SERVER]', {
            authBranch: 'none',
            bearerVerificationAttempted: false,
          });
        }

        throw new AppError(
          'Authentication is required.',
          401,
          'AUTHENTICATION_REQUIRED'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}