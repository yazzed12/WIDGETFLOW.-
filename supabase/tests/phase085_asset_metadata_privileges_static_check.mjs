import fs from 'node:fs';
import assert from 'node:assert/strict';

const gateway = fs.readFileSync(
  new URL('../functions/asset-gateway/index.ts', import.meta.url),
  'utf8',
);
const migration = fs.readFileSync(
  new URL('../migrations/077_asset_gateway_metadata_privileges.sql', import.meta.url),
  'utf8',
);

assert.match(gateway, /\.from\(['"]asset_metadata['"]\)[\s\S]*?\.insert\(/);
assert.match(gateway, /\.from\(['"]asset_metadata['"]\)[\s\S]*?\.update\(/);
assert.match(gateway, /\.from\(['"]asset_metadata['"]\)[\s\S]*?\.select\(/);
assert.match(migration, /grant\s+select\s*,\s*insert\s*,\s*update\s+on\s+table\s+public\.asset_metadata\s+to\s+service_role/i);
assert.doesNotMatch(migration, /grant\s+[^;]*\bdelete\b[^;]*asset_metadata/i);
assert.doesNotMatch(migration, /to\s+authenticated/i);
assert.match(migration, /076_general_asset_storage_bucket/);
assert.match(migration, /077_asset_gateway_metadata_privileges/);

console.log('phase085 asset_metadata privilege static check passed');
