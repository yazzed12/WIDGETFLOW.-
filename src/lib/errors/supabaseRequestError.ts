/** Keep transport metadata for internal auth recovery while using safe UI copy. */
export function supabaseRequestError(
  source: { code?: unknown; status?: unknown; message?: unknown; details?: unknown; hint?: unknown },
  responseStatus?: unknown,
  message = 'The request could not be completed.',
): Error & { code?: string; status?: number; details?: string; hint?: string; cause?: unknown } {
  const error = new Error(message) as Error & {
    code?: string; status?: number; details?: string; hint?: string; cause?: unknown;
  };
  error.code = typeof source.code === 'string' ? source.code : undefined;
  const status = Number(responseStatus ?? source.status);
  error.status = Number.isFinite(status) && status > 0 ? status : undefined;
  error.details = typeof source.details === 'string' ? source.details : undefined;
  error.hint = typeof source.hint === 'string' ? source.hint : undefined;
  error.cause = source;
  return error;
}
