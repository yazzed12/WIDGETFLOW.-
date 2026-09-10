import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('server/routes/assetRoutes.ts', 'utf8');
assert.doesNotMatch(source, /from ['"].*db\/database|dbRepository|better-sqlite3/);
assert.doesNotMatch(source, /writeFileSync|createWriteStream|server[\\/]uploads|fs\./);
assert.match(source, /createServiceRoleClient/);
assert.match(source, /asset_metadata/);
assert.match(source, /storage\.from\(bucket\)\.upload/);
assert.match(source, /storage\.from\(asset\.bucket_name\)\.download/);
assert.doesNotMatch(source, /JSON\.stringify\([^)]*\)\.includes/);
assert.match(source, /reports\.create/);
assert.match(source, /reports\.edit_draft/);
assert.match(source, /signatures\/\$\{req\.user\.id\}\/\$\{crypto\.randomUUID\(\)\}\.png/);
assert.match(source, /register_my_signature_asset/);
assert.doesNotMatch(source, /signature_profile\/\$\{req\.user\.id\}/);
console.log('phase077 asset gateway static checks passed');
