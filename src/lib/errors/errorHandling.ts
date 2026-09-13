export type AppErrorCode = 'INVALID_EMAIL' | 'INVALID_PASSWORD' | 'INVALID_INPUT' | 'EMAIL_ALREADY_EXISTS' | 'UNAUTHORIZED' | 'SESSION_EXPIRED' | 'FORBIDDEN' | 'NOT_FOUND' | 'NETWORK_ERROR' | 'INTERNAL_ERROR' | 'UNKNOWN';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly field?: string;
  constructor(code: AppErrorCode, message: string, field?: string) { super(message); this.name = 'AppError'; this.code = code; this.field = field; }
}

export function normalizeError(error: unknown): AppError {
  const source = error as { code?: unknown; message?: unknown } | null;
  const code = String(source?.code ?? '').toUpperCase();
  const message = String(source?.message ?? '');
  const lower = message.toLowerCase();
  if (code === 'EMAIL_ALREADY_EXISTS' || lower.includes('already exists') || lower.includes('duplicate')) return new AppError('EMAIL_ALREADY_EXISTS', 'An account with this email address already exists.', 'email');
  if (code === 'INVALID_EMAIL' || lower.includes('email is invalid') || lower.includes('invalid email')) return new AppError('INVALID_EMAIL', 'Please enter a valid email address.', 'email');
  if (code === 'INVALID_PASSWORD' || lower.includes('password must be between')) return new AppError('INVALID_PASSWORD', 'Password must be between 12 and 128 characters.', 'password');
  if (code === 'UNAUTHORIZED' || code === 'UNAUTHENTICATED' || code === 'AUTHENTICATION_REQUIRED') return new AppError('UNAUTHORIZED', 'Please sign in to continue.');
  if (code === 'SESSION_EXPIRED') return new AppError('SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
  if (code === 'FORBIDDEN' || code === 'PERMISSION_DENIED') return new AppError('FORBIDDEN', "You don't have permission to perform this action.");
  if (code === 'NETWORK_ERROR' || lower.includes('failed to fetch') || lower.includes('unable to reach')) return new AppError('NETWORK_ERROR', "We couldn't connect to the service. Check your connection and try again.");
  if (code === 'INVALID_INPUT') return new AppError('INVALID_INPUT', 'Please check the information entered and try again.');
  if (code === 'NOT_FOUND') return new AppError('NOT_FOUND', 'The requested item could not be found.');
  return new AppError('UNKNOWN', 'Something went wrong while processing your request. Please try again.');
}
