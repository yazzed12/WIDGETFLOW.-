import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(p, 'utf8');
const admin = read('src/features/admin/services/adminDataControlService.ts');
const importModal = read('src/components/template-builder/StudioWelcomeModal.tsx');
const client = read('src/services/httpClient.ts');
assert.match(admin, /functions\.invoke\('admin-factory-reset'/);
assert.match(admin, /functions\.invoke\('asset-gateway'/);
assert.match(importModal, /analyzeTemplateImportInBrowser/);
assert.doesNotMatch(importModal, /analyzeTemplateImport\(/);
assert.match(client, /import\.meta\.env\.DEV \? String\(import\.meta\.env\.VITE_API_BASE_URL/);
assert.ok(fs.existsSync('supabase/functions/asset-gateway/index.ts'));
assert.ok(fs.existsSync('supabase/functions/admin-factory-reset/index.ts'));
console.log('phase083 supabase-only cutover static check passed');
