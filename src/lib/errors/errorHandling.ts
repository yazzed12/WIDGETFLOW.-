export type AppErrorCode = 'INVALID_EMAIL' | 'INVALID_PASSWORD' | 'INVALID_INPUT' | 'EMAIL_ALREADY_EXISTS' | 'FILE_TYPE_NOT_SUPPORTED' | 'FILE_TOO_LARGE' | 'UNAUTHORIZED' | 'SESSION_EXPIRED' | 'FORBIDDEN' | 'NOT_FOUND' | 'NETWORK_ERROR' | 'INTERNAL_ERROR' | 'UNKNOWN';

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
  if (code === 'EMAIL_ALREADY_EXISTS' || lower.includes('already exists') || lower.includes('already uses') || lower.includes('duplicate')) return new AppError('EMAIL_ALREADY_EXISTS', 'An account with this email address already exists.', 'email');
  if (code === 'INVALID_EMAIL' || lower.includes('email is invalid') || lower.includes('invalid email')) return new AppError('INVALID_EMAIL', 'Please enter a valid email address.', 'email');
  if (code === 'INVALID_PASSWORD' || lower.includes('password must be between')) return new AppError('INVALID_PASSWORD', 'Password must be between 12 and 128 characters.', 'password');
  if (code === 'UNAUTHORIZED' || code === 'UNAUTHENTICATED' || code === 'AUTHENTICATION_REQUIRED') return new AppError('UNAUTHORIZED', 'Please sign in to continue.');
  if (code === 'SESSION_EXPIRED') return new AppError('SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
  if (code === 'FORBIDDEN' || code === 'PERMISSION_DENIED') return new AppError('FORBIDDEN', "You don't have permission to perform this action.");
  if (code === 'NETWORK_ERROR' || lower.includes('failed to fetch') || lower.includes('unable to reach')) return new AppError('NETWORK_ERROR', "We couldn't connect to the service. Check your connection and try again.");
  if (code === 'FILE_TOO_LARGE' || lower.includes('too large') || lower.includes('10 mib') || lower.includes('file size exceeds')) return new AppError('FILE_TOO_LARGE', 'This file is too large to upload.');
  if (code === 'FILE_TYPE_NOT_SUPPORTED' || lower.includes('unsupported file') || lower.includes('unsupported or missing file') || lower.includes('mime type')) return new AppError('FILE_TYPE_NOT_SUPPORTED', 'This file type is not supported.');
  if (code === 'ASSET_LINK_REQUIRED') return new AppError('INVALID_INPUT', 'Save the report before adding attachments.');
  if (code === 'RETURN_REASON_REQUIRED' || lower.includes('return_reason_required')) return new AppError('INVALID_INPUT', 'Please provide a reason for returning this item.');
  if (code === 'REJECTION_REASON_REQUIRED' || lower.includes('rejection_reason_required')) return new AppError('INVALID_INPUT', 'Please provide a reason for this action.');
  if (code === 'REPORT_NOT_ACTIONABLE' || lower.includes('report_not_actionable')) return new AppError('FORBIDDEN', 'This report is no longer available for this action.');
  if (code === 'ASSIGNMENT_NOT_OWNED' || lower.includes('assignment_not_owned') || code === 'SELF_RECIPIENT_ACTION_NOT_ALLOWED' || lower.includes('self_recipient_action_not_allowed')) return new AppError('FORBIDDEN', "You don't have permission to perform this action.");
  if (code === 'SIGNATURE_ASSIGNMENT_REQUIRED' || lower.includes('signature_assignment_required')) return new AppError('FORBIDDEN', 'Only assigned signers can return this report.');
  if (code === 'TEMPLATE_RETURN_NOT_ALLOWED' || lower.includes('template_return_not_allowed')) return new AppError('FORBIDDEN', "You don't have permission to return this template.");
  if (code === 'INVALID_INPUT') return new AppError('INVALID_INPUT', 'Please check the information entered and try again.');
  if (code === 'NOT_FOUND') return new AppError('NOT_FOUND', 'The requested item could not be found.');
  return new AppError('UNKNOWN', 'Something went wrong while processing your request. Please try again.');
}
