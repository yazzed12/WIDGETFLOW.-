import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('server/app.ts', 'utf8');
const canonical = fs.readFileSync('server/routes/canonicalAdminRoutes.ts', 'utf8');
const legacy = fs.readFileSync('server/legacy/legacyWiring.ts', 'utf8');

for (const forbidden of ['db/database', 'routes/apiRouter', 'services/adminService', 'repositories/dbRepository', 'better-sqlite3']) {
  assert.doesNotMatch(app, new RegExp(`from ['\"].*${forbidden.replace('/', '\\/')}`));
  assert.doesNotMatch(canonical, new RegExp(forbidden.replace('/', '\\/')));
}
assert.match(app, /canonicalAdminRouter/);
assert.match(app, /mountLegacyRuntime\(app, security\)/);
assert.match(legacy, /import\('\.\.\/db\/database\.js'\)/);
assert.match(legacy, /import\('\.\.\/routes\/apiRouter\.js'\)/);
console.log('phase080 production import graph static checks passed');
