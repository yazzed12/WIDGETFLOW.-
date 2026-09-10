import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync('server/routes/intakeRoutes.ts', 'utf8');
const service = fs.readFileSync('server/services/templateImportService.ts', 'utf8');
const app = fs.readFileSync('server/app.ts', 'utf8');

assert.match(route, /multer\.memoryStorage\(\)/);
assert.doesNotMatch(route, /dest\s*:/);
assert.doesNotMatch(route, /dbRepository|better-sqlite3|db\/database/);
assert.match(service, /file\.buffer/);
assert.doesNotMatch(service, /fs\.read|fs\.write|fs\.unlink|server[\\/]uploads/);
assert.match(app, /app\.use\('\/api', intakeRoutes\)/);
assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY|createServiceRoleClient/);
console.log('phase078 template import static checks passed');
