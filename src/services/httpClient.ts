import { getSupabaseBrowserClient } from '../lib/supabase/client';

export type BackendErrorCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED'
  | string;

export class ApiError extends Error {
  code: BackendErrorCode;
  statusCode: number;

  constructor(message: string, code: BackendErrorCode = 'API_ERROR', statusCode = 400) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export async function authenticatedBinaryRequest(endpoint: string): Promise<{ blob: Blob; contentType: string | null }> {
  const apiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  const requestUrl = endpoint.startsWith('/api') && apiBase ? `${apiBase}${endpoint}` : endpoint;
  let accessToken: string | undefined;
  try {
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    accessToken = data.session?.access_token;
  } catch {
    // Fall through to the standard authentication error below.
  }
  const headers = new Headers();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(requestUrl, { method: 'GET', headers, credentials: 'include' });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    let code = 'API_ERROR';
    try {
      const payload = await response.json() as { error?: { message?: string; code?: string } };
      message = payload.error?.message || message;
      code = payload.error?.code || code;
    } catch {
      // Binary/error responses without JSON retain the status-based message.
    }
    throw new ApiError(message, code, response.status);
  }
  return { blob: await response.blob(), contentType: response.headers.get('Content-Type') };
}

export async function httpRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  const requestUrl = endpoint.startsWith('/api') && apiBase ? `${apiBase}${endpoint}` : endpoint;
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Authorization')) {
    try {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
    } catch {
      // Legacy/session-authenticated requests continue without a bearer token.
    }
  }
  if (import.meta.env.DEV) {
    const { data: sessionData } = await getSupabaseBrowserClient().auth.getSession();
    console.info('[AUTH TRACE CLIENT]', {
      endpoint,
      supabaseSessionExists: Boolean(sessionData.session),
      accessTokenExists: Boolean(sessionData.session?.access_token),
      authorizationHeaderSet: headers.has('Authorization'),
      credentials: 'include',
    });
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      'Unable to reach WidgetFlow. Check your connection and try again.',
      'NETWORK_ERROR',
      503,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      'WidgetFlow returned an invalid response.',
      'INVALID_API_RESPONSE',
      response.status || 502,
    );
  }

  const envelope = payload as {
    success?: boolean;
    data?: T;
    error?: { code?: string; message?: string };
  };

  if (import.meta.env.DEV) {
    console.info('[AUTH TRACE CLIENT RESPONSE]', {
      endpoint: requestUrl,
      status: response.status,
      success: envelope.success === true,
      errorCode: envelope.error?.code,
      errorMessage: envelope.error?.message,
    });
  }

  if (!response.ok || envelope.success !== true) {
    const apiError = new ApiError(
      envelope.error?.message || `Request failed with status ${response.status}.`,
      envelope.error?.code || 'API_ERROR',
      response.status,
    );
    throw apiError;
  }

  return envelope.data as T;
}
