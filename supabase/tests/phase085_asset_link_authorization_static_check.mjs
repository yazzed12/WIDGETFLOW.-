import assert from 'node:assert/strict';
import fs from 'node:fs';

const gateway = fs.readFileSync('supabase/functions/asset-gateway/index.ts', 'utf8');
const auth = fs.readFileSync('supabase/functions/_shared/auth.ts', 'utf8');
const responses = fs.readFileSync('supabase/functions/_shared/responses.ts', 'utf8');

assert.match(auth, /const url = requiredEnvironment\('SUPABASE_URL'\)/);
assert.match(auth, /const value = Deno\.env\.get\(name\)/);
assert.match(auth, /requiredEnvironment\('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'\)/);
assert.match(auth, /global: \{ headers: \{ Authorization: authorization \} \}/);
assert.match(auth, /userClient\.auth\.getUser\(match\[1\]\)/);

assert.match(gateway, /effectivePermissions/);
assert.match(gateway, /row\?\.effective_permissions/);
assert.match(gateway, /hasReportAttachmentPermission\(principal\)/);
assert.match(gateway, /if \(queryFailureCode\)[\s\S]*?queryFailureCode/);
assert.match(gateway, /'ASSET_LINK_PERMISSION_QUERY_FAILED'/);
assert.match(gateway, /'ASSET_LINK_REPORT_LOOKUP_FAILED'/);
assert.match(gateway, /onStep\('report_lookup'\)/);
assert.match(gateway, /onStep\('ownership_check'\)/);
assert.match(gateway, /onStep\('permission_check'\)/);
assert.match(gateway, /onStep\('authorization_complete'\)/);
assert.match(gateway, /verified\.userClient[\s\S]*?\.from\('reports'\)[\s\S]*?\.select\('id,created_by_user_id,status,locked_at'\)/);
assert.match(gateway, /logPostgrestFailure\(requestId, 'report_lookup', error\)/);
assert.match(gateway, /if \(!canWriteReportAttachment\(principal, report\)\)[\s\S]*?'FORBIDDEN'/);
assert.match(gateway, /logAuthorizationStep\(requestId, 'authorization_complete', 'succeeded'\)/);
assert.match(responses, /X-WidgetFlow-Auth-Step/);
assert.match(responses, /'report_lookup'/);
assert.doesNotMatch(gateway, /X-WidgetFlow-Auth-Step.*error/i);

console.log('phase085 asset link authorization checks passed');
