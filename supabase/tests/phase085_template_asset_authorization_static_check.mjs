import assert from 'node:assert/strict';
import fs from 'node:fs';

const gateway = fs.readFileSync('supabase/functions/asset-gateway/index.ts', 'utf8');

const templateGuard = gateway.match(/async function requireTemplateAssetWriteAccess[\s\S]*?\n}\n\nasync function canReadReport/);
assert.ok(templateGuard, 'template asset authorization guard must exist');
const guard = templateGuard[0];

assert.match(guard, /principal\.effectivePermissions\.includes\('templates\.create'\)/);
assert.match(guard, /principal\.effectivePermissions\.includes\('templates\.edit_draft'\)/);
assert.match(guard, /'FORBIDDEN'/);
assert.match(guard, /verified\.userClient[\s\S]*?\.from\('templates'\)/);
assert.match(guard, /created_by_user_id !== principal\.userId/);
assert.match(guard, /\['draft', 'rejected'\]\.includes\(status\)/);
assert.doesNotMatch(guard, /role_permissions/);
assert.doesNotMatch(guard, /adminClient/);

// Report authorization remains on its existing canonical path.
assert.match(gateway, /requireReportAttachmentWriteAccess\(/);
assert.match(gateway, /hasReportAttachmentPermission\(principal\)/);

console.log('phase085 template asset authorization checks passed');
