import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const incomingBearer = 'Bearer test-user-jwt';
let observedAuthorization: string | null = null;
let observedApiKey: string | null = null;

const client = createClient(
  'https://example.supabase.co',
  'test-publishable-key',
  {
    global: {
      headers: { Authorization: incomingBearer },
      fetch: async (_input, init) => {
        const headers = new Headers(init?.headers);
        observedAuthorization = headers.get('Authorization');
        observedApiKey = headers.get('apikey');
        return new Response('[]', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

await client
  .from('reports')
  .select('id,created_by_user_id,status,locked_at')
  .eq('id', '3f5303d4-a8e7-47ea-b511-5e4bfe0fa9fd')
  .maybeSingle();

assert.equal(observedAuthorization, incomingBearer);
assert.equal(observedApiKey, 'test-publishable-key');

console.log('phase085 authenticated user-client header checks passed');
