import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../../src/components/template-builder/StudioWelcomeModal.tsx', import.meta.url), 'utf8');
const browser = fs.readFileSync(new URL('../../src/services/templateImportBrowser.ts', import.meta.url), 'utf8');
const builder = fs.readFileSync(new URL('../../src/components/template-builder/TemplateBuilder.tsx', import.meta.url), 'utf8');
const types = fs.readFileSync(new URL('../../src/types/index.ts', import.meta.url), 'utf8');
const apiService = fs.readFileSync(new URL('../../src/services/apiService.ts', import.meta.url), 'utf8');

assert.match(builder, /StudioWelcomeModal/);
assert.match(modal, /activeMode === 'analysis'/);
assert.match(modal, /onImportProposalReady\(/);
assert.match(modal, /updateImportedComponent/);
assert.match(modal, /moveImportedComponent/);
assert.match(modal, /required: event\.target\.checked/);
assert.match(modal, /ignored/);
assert.match(modal, /cancelImport/);
assert.match(builder, /creationMethod: 'import'/);
assert.match(builder, /id: importedTpl\.id \|\| templateState\.id/);
assert.match(builder, /This template is not editable/);
assert.match(builder, /source: _source/);
assert.match(browser, /status: 'Draft'/);
assert.match(browser, /Legacy workflow or logic metadata was ignored/);
assert.match(browser, /MAX_ROWS/);
assert.match(browser, /MAX_COMPONENTS/);
assert.match(browser, /Hidden workbook sheets were not imported/);
assert.match(browser, /sanitizeHtml/);
assert.match(apiService, /Legacy compatibility endpoint/);
assert.doesNotMatch(browser, /workflow:/);
assert.doesNotMatch(modal, /workflow/i);
assert.match(types, /confidenceReason\?/);

console.log('phase2a.1 import hardening checks passed');
