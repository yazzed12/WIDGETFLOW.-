import assert from 'node:assert/strict';
import fs from 'node:fs';

const gateway = fs.readFileSync('supabase/functions/asset-gateway/index.ts', 'utf8');
const responses = fs.readFileSync('supabase/functions/_shared/responses.ts', 'utf8');

for (const code of ['ASSET_STORAGE_UPLOAD_FAILED', 'ASSET_METADATA_REGISTRATION_FAILED', 'ASSET_HASH_FAILED', 'ASSET_GATEWAY_UNEXPECTED_FAILURE']) {
  assert.match(responses, new RegExp(code));
  assert.match(gateway, new RegExp(code));
}
assert.match(gateway, /logUploadStage\(requestId, 'storage_upload'/);
assert.match(gateway, /logUploadStage\(requestId, 'metadata_insert'/);
assert.match(gateway, /logUploadStage\(requestId, 'rollback'/);
assert.match(gateway, /remove\(\[objectPath\]\)/);
assert.match(gateway, /The file could not be uploaded\./);
assert.match(gateway, /The operation could not be completed\./);
assert.match(gateway, /stage = 'request_parsing'/);
assert.match(gateway, /stage = 'authentication'/);
assert.match(gateway, /stage = 'principal_resolution'/);
assert.match(gateway, /stage = 'payload_decoding'/);
assert.match(gateway, /stage = 'response_serialization'/);
assert.match(gateway, /diagnosticCode: safeError\.code/);
assert.match(gateway, /failure\([\s\S]*?request,[\s\S]*?safeError,[\s\S]*?requestId,[\s\S]*?SAFE_GATEWAY_STAGES\.has\(stage\)/);
assert.match(responses, /safe\.code/);
assert.match(responses, /'X-Request-ID'/);
assert.match(responses, /Access-Control-Expose-Headers/);
assert.match(responses, /'X-WidgetFlow-Stage': safeStage/);
assert.doesNotMatch(gateway, /console\.(info|error)\([^)]*(base64|token|secret|password)/i);

console.log('phase085 asset stage diagnostics static checks passed');
