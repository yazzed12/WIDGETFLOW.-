import assert from 'node:assert/strict';
import fs from 'node:fs';
import { templateImportService } from '../services/templateImportService.js';

const browserSource = fs.readFileSync(new URL('../../src/services/templateImportBrowser.ts', import.meta.url), 'utf8');
const modalSource = fs.readFileSync(new URL('../../src/components/template-builder/StudioWelcomeModal.tsx', import.meta.url), 'utf8');
const builderSource = fs.readFileSync(new URL('../../src/components/template-builder/TemplateBuilder.tsx', import.meta.url), 'utf8');

const valid = JSON.stringify({ name: 'Imported Safety Form', sections: ['General'], components: [{ id: 'field-1', type: 'text', key: 'safety_name', label: 'Safety name', section: 'General', order: 0 }] });
const proposal = templateImportService.analyzeJson(valid, 'safety.json');
assert.equal(proposal.creationMethod, 'import');
assert.equal(proposal.template.status, 'Draft');
assert.equal((proposal.template.components || [])[0].key, 'safety_name');

assert.throws(() => templateImportService.analyzeJson(JSON.stringify({ name: '', components: [] }), 'invalid.json'));
assert.match(browserSource, /convertToHtml/);
assert.match(browserSource, /sheetNames\.slice\(0, MAX_SECTIONS\)\.forEach/);
assert.match(browserSource, /cell\?\.f/);
assert.match(browserSource, /analyzePdfTemplateImport/);
assert.match(modalSource, /activeMode === 'analysis'/);
assert.match(modalSource, /Create Template/);
assert.match(builderSource, /creationMethod: 'import'/);
assert.match(builderSource, /fields: normalizedComponents/);

console.log('phase2a import checks passed');
