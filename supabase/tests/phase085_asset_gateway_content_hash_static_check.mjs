import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

const source = fs.readFileSync('supabase/functions/asset-gateway/index.ts', 'utf8');
assert.match(source, /crypto\.subtle\.digest\('SHA-256', bytes\)/);
assert.match(source, /const contentHash = await sha256Hex\(data\)/);
assert.match(source, /content_hash: contentHash/);
assert.match(source, /\.from\(BUCKET\)[\s\S]*?\.remove\(\[objectPath\]\)/);

const bytes = new TextEncoder().encode('widgetflow-content-hash-test');
const hash = (value) => createHash('sha256').update(value).digest('hex');
assert.equal(hash(bytes), hash(bytes), 'identical bytes must hash identically');
assert.notEqual(hash(bytes), hash(new TextEncoder().encode('different-bytes')));
assert.match(hash(bytes), /^[0-9a-f]{64}$/);

console.log('phase085 asset content-hash checks passed');
