import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const bundle = buildSync({
  entryPoints: ['src/lib/errors/errorHandling.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
});
const moduleSource = bundle.outputFiles[0].text;
const module = { exports: {} };
new Function('module', 'exports', moduleSource)(module, module.exports);
const { normalizeError } = module.exports;

const password = normalizeError({
  code: 'INVALID_INPUT',
  message: 'Password must be between 12 and 128 characters.',
});
assert.equal(password.code, 'INVALID_PASSWORD');
assert.equal(password.field, 'password');
assert.equal(password.message, 'Password must be between 12 and 128 characters.');

const email = normalizeError({ code: 'INVALID_INPUT', message: 'email is invalid.' });
assert.equal(email.code, 'INVALID_EMAIL');
assert.equal(email.field, 'email');
assert.equal(email.message, 'Please enter a valid email address.');

console.log('phase2a runtime normalization checks passed');
