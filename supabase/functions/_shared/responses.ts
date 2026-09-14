export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'ACCOUNT_INACTIVE'
  | 'ADMIN_REQUIRED'
  | 'TARGET_NOT_FOUND'
  | 'ROLE_NOT_FOUND'
  | 'ROLE_INACTIVE'
  | 'PROTECTED_ADMIN'
  | 'LAST_ACTIVE_ADMIN'
  | 'GOVERNANCE_REVIEWER_DEPENDENCY'
  | 'GOVERNANCE_ROLE_QUEUE_EMPTY'
  | 'EMAIL_ALREADY_EXISTS'
  | 'INVALID_INPUT'
  | 'METHOD_NOT_ALLOWED'
  | 'ORIGIN_NOT_ALLOWED'
  | 'ACCOUNT_CREATE_FAILED'
  | 'PASSWORD_RESET_FAILED'
  | 'SIGNATURE_ASSET_NOT_FOUND'
  | 'SIGNATURE_ASSET_NOT_REFERENCED_BY_REPORT'
  | 'REPORT_NOT_VISIBLE'
  | 'ASSET_STORAGE_UPLOAD_FAILED'
  | 'ASSET_METADATA_REGISTRATION_FAILED'
  | 'ASSET_HASH_FAILED'
  | 'ASSET_GATEWAY_UNEXPECTED_FAILURE'
  | 'ASSET_LINK_REQUIRED'
  | 'ASSET_LINK_PERMISSION_QUERY_FAILED'
  | 'ASSET_LINK_REPORT_LOOKUP_FAILED'
  | 'INTERNAL_ERROR';

const SAFE_FAILURE_STAGES = new Set([
  'authentication',
  'principal_resolution',
  'request_parsing',
  'validation',
  'link_authorization',
  'payload_decoding',
  'hashing',
  'storage_upload',
  'metadata_insert',
  'metadata_lookup',
  'storage_download',
  'rollback',
  'response_serialization',
  'unexpected',
]);

const SAFE_AUTH_STEPS = new Set([
  'permission_query',
  'report_lookup',
  'ownership_check',
  'permission_check',
  'authorization_complete',
]);

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, boolean | string>,
  ) {
    super(message);
  }
}

const SAFE_DATABASE_ERRORS: Record<
  string,
  [number, ErrorCode, string]
> = {
  ADMIN_REQUIRED: [
    403,
    'ADMIN_REQUIRED',
    'An active protected Admin is required.',
  ],

  TARGET_NOT_FOUND: [
    404,
    'TARGET_NOT_FOUND',
    'The target account was not found.',
  ],

  TARGET_AUTH_USER_NOT_FOUND: [
    404,
    'TARGET_NOT_FOUND',
    'The target Auth account was not found.',
  ],

  ROLE_NOT_FOUND: [
    404,
    'ROLE_NOT_FOUND',
    'The requested role was not found.',
  ],

  ROLE_INACTIVE: [
    409,
    'ROLE_INACTIVE',
    'The requested role is inactive.',
  ],

  PROTECTED_ADMIN: [
    409,
    'PROTECTED_ADMIN',
    'Protected Admin accounts require a dedicated lifecycle operation.',
  ],

  LAST_ACTIVE_ADMIN: [
    409,
    'LAST_ACTIVE_ADMIN',
    'The last active protected Admin cannot be changed.',
  ],

  GOVERNANCE_REVIEWER_DEPENDENCY: [
    409,
    'GOVERNANCE_REVIEWER_DEPENDENCY',
    'This account is required by a specific-user governance route.',
  ],

  GOVERNANCE_ROLE_QUEUE_EMPTY: [
    409,
    'GOVERNANCE_ROLE_QUEUE_EMPTY',
    'This change would leave a governance role queue without an eligible reviewer.',
  ],

  EMAIL_ALREADY_EXISTS: [
    409,
    'EMAIL_ALREADY_EXISTS',
    'An account already uses this email address.',
  ],

  INVALID_INPUT: [
    400,
    'INVALID_INPUT',
    'The request is invalid.',
  ],

  ASSET_LINK_REQUIRED: [
    400,
    'ASSET_LINK_REQUIRED',
    'The asset must be linked to its parent record.',
  ],

  MANAGER_NOT_ACTIVE: [
    409,
    'INVALID_INPUT',
    'The selected manager is not active.',
  ],

  AUTH_EMAIL_MISMATCH: [
    409,
    'ACCOUNT_CREATE_FAILED',
    'The Auth and profile email values did not match.',
  ],

  REPORT_NOT_VISIBLE: [
    403,
    'FORBIDDEN',
    'The report or signature asset is not available.',
  ],

  SIGNATURE_ASSET_NOT_REFERENCED_BY_REPORT: [
    404,
    'TARGET_NOT_FOUND',
    'The signature asset was not found.',
  ],

  SIGNATURE_ASSET_NOT_FOUND: [
    404,
    'TARGET_NOT_FOUND',
    'The signature asset was not found.',
  ],

  PROTECTED_ADMIN_ROLE_INVALID: [
    500,
    'INTERNAL_ERROR',
    'The protected Admin role is unavailable.',
  ],
};

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://widgetflow-pi.vercel.app',
]);

/*
 * Vercel preview hostnames are deployment-specific. Keep the exception
 * anchored to this WidgetFlow project/team hostname rather than trusting
 * arbitrary *.vercel.app origins.
 */
const WIDGETFLOW_VERCEL_PREVIEW_ORIGIN =
  /^https:\/\/widgetflow-[a-z0-9][a-z0-9-]*-yazzed12s-projects\.vercel\.app$/i;

function allowedOrigins(): Set<string> {
  const origins = new Set(DEFAULT_ALLOWED_ORIGINS);
  const configured =
    Deno.env.get('WIDGETFLOW_ALLOWED_ORIGINS') ?? '';

  for (const origin of configured
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)) {
    origins.add(origin);
  }

  return origins;
}

export function isAllowedOrigin(origin: string): boolean {
  return (
    allowedOrigins().has(origin) ||
    WIDGETFLOW_VERCEL_PREVIEW_ORIGIN.test(origin)
  );
}

export function corsHeaders(
  request: Request,
): HeadersInit {
  const origin =
    request.headers.get('origin');

  if (origin && !isAllowedOrigin(origin)) {
    throw new ApiError(
      403,
      'ORIGIN_NOT_ALLOWED',
      'This origin is not allowed.',
    );
  }

  return {
    ...(origin
      ? {
          'Access-Control-Allow-Origin':
            origin,
          Vary: 'Origin',
        }
      : {}),

    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info',

    /*
     * GET is required by asset-gateway protected downloads.
     */
    'Access-Control-Allow-Methods':
      'GET, POST, OPTIONS',

    'Access-Control-Expose-Headers':
      'X-Request-ID, X-WidgetFlow-Stage, X-WidgetFlow-Auth-Step',

    'Access-Control-Max-Age':
      '600',

    'Content-Type':
      'application/json; charset=utf-8',

    'Cache-Control':
      'no-store',
  };
}

export function preflight(
  request: Request,
): Response | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  return new Response(
    null,
    {
      status: 204,
      headers: corsHeaders(request),
    },
  );
}

export function requirePost(
  request: Request,
): void {
  if (request.method !== 'POST') {
    throw new ApiError(
      405,
      'METHOD_NOT_ALLOWED',
      'Only POST is supported.',
    );
  }
}

export function success(
  request: Request,
  data: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status,
      headers: corsHeaders(request),
    },
  );
}

export function databaseError(
  error: { message?: string } | null,
): ApiError {
  const message =
    error?.message ?? '';

  for (
    const [
      databaseCode,
      [
        status,
        code,
        safeMessage,
      ],
    ] of Object.entries(
      SAFE_DATABASE_ERRORS,
    )
  ) {
    if (
      message.includes(databaseCode)
    ) {
      return new ApiError(
        status,
        code,
        safeMessage,
      );
    }
  }

  return new ApiError(
    500,
    'INTERNAL_ERROR',
    'The operation could not be completed.',
  );
}

export function failure(
  request: Request,
  error: unknown,
  requestId?: string,
  stage?: string,
  authStep?: string,
): Response {
  const safeStage =
    stage && SAFE_FAILURE_STAGES.has(stage)
      ? stage
      : 'unexpected';
  const safeAuthStep =
    authStep && SAFE_AUTH_STEPS.has(authStep)
      ? authStep
      : null;

  let safe =
    error instanceof ApiError
      ? error
      : new ApiError(
          500,
          'INTERNAL_ERROR',
          'The operation could not be completed.',
        );

  try {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: safe.code,
          message: safe.message,
          ...(safe.details
            ? {
                details:
                  safe.details,
              }
            : {}),
        },
      }),
      {
        status: safe.status,
        headers: {
          ...corsHeaders(request),
          'X-Request-ID': requestId ?? crypto.randomUUID(),
          'X-WidgetFlow-Stage': safeStage,
          ...(safeAuthStep ? { 'X-WidgetFlow-Auth-Step': safeAuthStep } : {}),
        },
      },
    );
  } catch (corsError) {
    safe =
      corsError instanceof ApiError
        ? corsError
        : new ApiError(
            403,
            'ORIGIN_NOT_ALLOWED',
            'This origin is not allowed.',
          );

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: safe.code,
          message: safe.message,
        },
      }),
      {
        status: safe.status,
        headers: {
          'Content-Type':
            'application/json; charset=utf-8',
          'Cache-Control':
            'no-store',
          'X-Request-ID': requestId ?? crypto.randomUUID(),
          'X-WidgetFlow-Stage': safeStage,
          ...(safeAuthStep ? { 'X-WidgetFlow-Auth-Step': safeAuthStep } : {}),
        },
      },
    );
  }
}
