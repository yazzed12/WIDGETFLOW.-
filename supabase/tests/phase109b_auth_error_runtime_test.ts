import assert from 'node:assert/strict';
import { supabaseRequestError } from '../../src/lib/errors/supabaseRequestError.ts';
import { isAuthenticationFailure } from '../../src/features/workspace/workspaceRequestControl.ts';
import { normalizeError } from '../../src/lib/errors/errorHandling.ts';

for (const source of [
  { code: 'PGRST301', status: 401 },
  { code: 'JWT_EXPIRED', status: 400 },
  { code: 'INVALID_JWT', status: 400 },
  { code: 'AUTH_SESSION_MISSING', status: 400 },
  { code: 'UNKNOWN_BACKEND_CODE', status: 401 },
]) {
  const internal = supabaseRequestError({ ...source, message: 'raw database internals' }, source.status, 'Safe request error.');
  assert.equal(internal.code, source.code);
  assert.equal(internal.status, source.status);
  assert.equal(isAuthenticationFailure(internal), true);
  const publicError = normalizeError(internal);
  assert.equal(publicError.code, 'SESSION_EXPIRED');
  assert.equal(publicError.message, 'Your session has expired. Please sign in again.');
  assert.ok(!publicError.message.includes('raw database internals'));
}
console.log('Phase 109B authentication error metadata runtime checks passed');
