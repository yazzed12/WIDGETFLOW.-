import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync('server/services/protectedStorageCleanupService.ts', 'utf8');
const serviceRole = fs.readFileSync('server/services/supabaseServiceRoleClient.ts', 'utf8');
const route = fs.readFileSync('server/routes/adminRoutes.ts', 'utf8');
const frontendService = fs.readFileSync('src/features/admin/services/adminDataControlService.ts', 'utf8');

assert.match(service, /admin_preview_asset_cleanup/);
assert.match(service, /admin_finalize_asset_metadata_cleanup/);
assert.match(serviceRole, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(serviceRole, /persistSession:\s*false/);
assert.match(service, /remove\(\[objectPath\]\)/);
assert.match(service, /exactObjectExists/);
assert.match(service, /DELETE ORPHAN ASSETS/);
assert.match(service, /DELETE ORPHAN ASSET METADATA/);
assert.match(service, /PHYSICAL_DELETE_REQUIRED/);
assert.match(service, /SAFE_METADATA_DELETE/);
assert.doesNotMatch(service, /\.from\(['"]asset_metadata['"]\)/);
assert.match(service, /p_confirmation:\s*FINALIZE_CONFIRMATION/);
assert.doesNotMatch(service, /remove\(\[[^\]]*\*|remove\(\[[^\]]*\/\s*\]/);
assert.match(route, /data-control\/assets\/cleanup/);
assert.match(route, /cleanupOrphanAssets/);
assert.match(frontendService, /\/api\/admin\/data-control\/assets\/cleanup/);
assert.doesNotMatch(frontendService, /SUPABASE_SERVICE_ROLE_KEY|createServiceRoleClient/);
console.log('phase066 storage cleanup static checks passed');
