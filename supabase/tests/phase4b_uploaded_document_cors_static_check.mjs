import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const read = (file) => fs.readFileSync(file, 'utf8');
const httpClient = read('src/services/httpClient.ts');
const gateway = read('supabase/functions/asset-gateway/index.ts');
const responseHelpers = read('supabase/functions/_shared/responses.ts');

assert.match(httpClient, /const assetMatch = endpoint\.match\(\/\^\\\/api\\\/assets/);
assert.match(httpClient, /headers\.set\('Authorization', `Bearer \$\{accessToken\}`\)/);
assert.match(httpClient, /credentials: assetMatch \? 'omit' : 'include'/);
assert.match(httpClient, /does not use browser cookies/);

assert.match(responseHelpers, /'Access-Control-Allow-Headers':\s*'authorization, apikey, content-type, x-client-info'/);
assert.match(responseHelpers, /'Access-Control-Allow-Methods':\s*'GET, POST, OPTIONS'/);
assert.match(responseHelpers, /'Access-Control-Allow-Origin':\s*origin/);
assert.doesNotMatch(responseHelpers, /Access-Control-Allow-Credentials/);
assert.match(gateway, /\.\.\.corsHeaders\(request\)/);
assert.match(gateway, /'Content-Type':\s*asset\.mime_type/);
assert.match(gateway, /'Content-Disposition':/);
assert.match(gateway, /'Cache-Control':\s*'private, no-store'/);

const output = path.join(os.tmpdir(), `widgetflow-uploaded-document-cors-${process.pid}.mjs`);
try {
  execFileSync('npx', [
    'esbuild',
    'supabase/functions/_shared/responses.ts',
    '--bundle',
    '--format=esm',
    '--platform=node',
    `--outfile=${output}`,
  ], { stdio: 'ignore' });

  globalThis.Deno = { env: { get: () => undefined } };
  const { ApiError, corsHeaders, failure, preflight } = await import(pathToFileURL(output).href);
  const request = new Request('https://project.supabase.co/functions/v1/asset-gateway/id', {
    method: 'OPTIONS',
    headers: {
      origin: 'http://localhost:5173',
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'authorization',
    },
  });
  const options = preflight(request);
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173');
  assert.match(options.headers.get('Access-Control-Allow-Methods') ?? '', /GET/);
  assert.match(options.headers.get('Access-Control-Allow-Headers') ?? '', /authorization/);
  assert.equal(options.headers.get('Access-Control-Allow-Credentials'), null);

  const binaryHeaders = new Headers(corsHeaders(new Request(request.url, {
    headers: { origin: 'http://localhost:5173' },
  })));
  assert.equal(binaryHeaders.get('Access-Control-Allow-Origin'), 'http://localhost:5173');
  assert.equal(binaryHeaders.get('Cache-Control'), 'no-store');

  assert.throws(
    () => corsHeaders(new Request(request.url, { headers: { origin: 'https://unrelated.example' } })),
    (error) => error instanceof ApiError && error.code === 'ORIGIN_NOT_ALLOWED',
  );

  const errorResponse = failure(
    new Request(request.url, { headers: { origin: 'http://localhost:5173' } }),
    new ApiError(500, 'ASSET_GATEWAY_UNEXPECTED_FAILURE', 'The operation could not be completed.'),
    '00000000-0000-4000-8000-000000000001',
    'storage_download',
  );
  assert.equal(errorResponse.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173');
  assert.equal(errorResponse.status, 500);
} finally {
  fs.rmSync(output, { force: true });
}

console.log('PASS: uploaded report document CORS contract');
