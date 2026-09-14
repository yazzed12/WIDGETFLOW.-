import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const source = fs.readFileSync(
  'supabase/functions/_shared/responses.ts',
  'utf8',
);

assert.match(source, /http:\/\/localhost:5173/);
assert.match(source, /http:\/\/127\.0\.0\.1:5173/);
assert.match(source, /https:\/\/widgetflow-pi\.vercel\.app/);
assert.match(
  source,
  /widgetflow-\[a-z0-9\]\[a-z0-9-\]\*-yazzed12s-projects\\\.vercel\\\.app/,
);
assert.doesNotMatch(source, /Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/);
assert.match(source, /Access-Control-Allow-Methods['"]:\s*['"]GET, POST, OPTIONS/);
assert.match(
  source,
  /Access-Control-Expose-Headers['"]:\s*['"]X-Request-ID, X-WidgetFlow-Stage, X-WidgetFlow-Auth-Step/,
);
assert.match(source, /status:\s*204/);
assert.match(source, /ORIGIN_NOT_ALLOWED/);

const output = path.join(os.tmpdir(), `widgetflow-cors-${process.pid}.mjs`);
execFileSync('npx', [
  'esbuild',
  'supabase/functions/_shared/responses.ts',
  '--bundle',
  '--format=esm',
  '--platform=node',
  `--outfile=${output}`,
], { stdio: 'ignore' });

const env = new Map();
globalThis.Deno = { env: { get: (key) => env.get(key) } };
const {
  ApiError,
  corsHeaders,
  failure,
  isAllowedOrigin,
  preflight,
} =
  await import(pathToFileURL(output).href);

assert.equal(isAllowedOrigin('http://localhost:5173'), true);
assert.equal(isAllowedOrigin('http://127.0.0.1:5173'), true);
assert.equal(isAllowedOrigin('https://widgetflow-pi.vercel.app'), true);
assert.equal(
  isAllowedOrigin('https://widgetflow-bf4f6exhk-yazzed12s-projects.vercel.app'),
  true,
);
assert.equal(
  isAllowedOrigin('https://otherapp-bf4f6exhk-yazzed12s-projects.vercel.app'),
  false,
);
assert.equal(isAllowedOrigin('https://evil.example'), false);
assert.equal(isAllowedOrigin('https://widgetflow.example.vercel.app'), false);

env.set(
  'WIDGETFLOW_ALLOWED_ORIGINS',
  'https://preview.widgetflow.example',
);
assert.equal(isAllowedOrigin('https://preview.widgetflow.example'), true);

const approvedRequest = new Request(
  'https://example.test/functions/v1/asset-gateway',
  { headers: { origin: 'https://widgetflow-pi.vercel.app' } },
);
const approvedHeaders = new Headers(corsHeaders(approvedRequest));
assert.equal(
  approvedHeaders.get('Access-Control-Allow-Origin'),
  'https://widgetflow-pi.vercel.app',
);
assert.equal(
  preflight(new Request(approvedRequest, { method: 'OPTIONS' })).status,
  204,
);

assert.throws(
  () => corsHeaders(new Request(approvedRequest, {
    headers: { origin: 'https://otherapp.example' },
  })),
  (error) => error instanceof ApiError && error.code === 'ORIGIN_NOT_ALLOWED',
);

const rejectedFailure = failure(
  new Request('https://example.test/functions/v1/asset-gateway', {
    headers: { origin: 'https://otherapp.example' },
  }),
  new ApiError(500, 'INTERNAL_ERROR', 'The operation could not be completed.'),
  '00000000-0000-4000-8000-000000000010',
  'validation',
);
const rejectedPayload = await rejectedFailure.json();
assert.equal(rejectedPayload.error.code, 'ORIGIN_NOT_ALLOWED');
assert.equal(rejectedFailure.headers.get('Access-Control-Allow-Origin'), null);
assert.equal(
  rejectedFailure.headers.get('X-Request-ID'),
  '00000000-0000-4000-8000-000000000010',
);
assert.equal(rejectedFailure.headers.get('X-WidgetFlow-Stage'), 'validation');

fs.rmSync(output, { force: true });
console.log('CORS policy static checks passed');
