import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const output = path.join(os.tmpdir(), `widgetflow-responses-${process.pid}.mjs`);
execFileSync('npx', [
  'esbuild',
  'supabase/functions/_shared/responses.ts',
  '--bundle',
  '--format=esm',
  '--platform=node',
  `--outfile=${output}`,
], { stdio: 'ignore' });

globalThis.Deno = { env: { get: () => undefined } };
const { ApiError, failure } = await import(pathToFileURL(output).href);

for (const code of [
  'ASSET_HASH_FAILED',
  'ASSET_STORAGE_UPLOAD_FAILED',
  'ASSET_METADATA_REGISTRATION_FAILED',
  'ASSET_GATEWAY_UNEXPECTED_FAILURE',
]) {
  const response = failure(
    new Request('https://example.test/functions/v1/asset-gateway'),
    new ApiError(500, code, 'The operation could not be completed.'),
    '00000000-0000-4000-8000-000000000001',
    'metadata_insert',
    code === 'ASSET_GATEWAY_UNEXPECTED_FAILURE' ? 'report_lookup' : undefined,
  );
  const payload = await response.json();
  assert.equal(payload.success, false);
  assert.equal(payload.error.code, code);
  assert.equal(response.headers.get('X-Request-ID'), '00000000-0000-4000-8000-000000000001');
  assert.equal(response.headers.get('X-WidgetFlow-Stage'), 'metadata_insert');
  if (code === 'ASSET_GATEWAY_UNEXPECTED_FAILURE') {
    assert.equal(response.headers.get('X-WidgetFlow-Auth-Step'), 'report_lookup');
  }
  assert.match(response.headers.get('Access-Control-Expose-Headers') ?? '', /X-Request-ID/);
  assert.match(response.headers.get('Access-Control-Expose-Headers') ?? '', /X-WidgetFlow-Stage/);
  assert.doesNotMatch(JSON.stringify(payload), /operator-only|secret|stack|postgres|raw failure/i);
  assert.doesNotMatch([...response.headers.values()].join('\n'), /operator-only|secret|stack|postgres|raw failure/i);
}

const fallbackResponse = failure(
  new Request('https://example.test/functions/v1/asset-gateway'),
  new ApiError(500, 'ASSET_GATEWAY_UNEXPECTED_FAILURE', 'The operation could not be completed.'),
  '00000000-0000-4000-8000-000000000002',
  'not-a-real-stage',
);
assert.equal(fallbackResponse.headers.get('X-WidgetFlow-Stage'), 'unexpected');

const permissionFailure = failure(
  new Request('https://example.test/functions/v1/asset-gateway'),
  new ApiError(500, 'ASSET_LINK_PERMISSION_QUERY_FAILED', 'The operation could not be completed.'),
  '00000000-0000-4000-8000-000000000003',
  'link_authorization',
  'permission_query',
);
assert.equal((await permissionFailure.clone().json()).error.code, 'ASSET_LINK_PERMISSION_QUERY_FAILED');
assert.equal(permissionFailure.headers.get('X-WidgetFlow-Auth-Step'), 'permission_query');

const reportLookupFailure = failure(
  new Request('https://example.test/functions/v1/asset-gateway'),
  new ApiError(500, 'ASSET_LINK_REPORT_LOOKUP_FAILED', 'The operation could not be completed.'),
  '00000000-0000-4000-8000-000000000004',
  'link_authorization',
  'report_lookup',
);
assert.equal((await reportLookupFailure.clone().json()).error.code, 'ASSET_LINK_REPORT_LOOKUP_FAILED');
assert.equal(reportLookupFailure.headers.get('X-WidgetFlow-Auth-Step'), 'report_lookup');
assert.doesNotMatch(await reportLookupFailure.text(), /postgres|supabase|constraint|raw database failure/i);

fs.rmSync(output, { force: true });
console.log('phase085 response serialization checks passed');
