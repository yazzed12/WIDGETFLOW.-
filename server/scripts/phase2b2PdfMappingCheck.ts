import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../../src/components/template-builder/StudioWelcomeModal.tsx', import.meta.url), 'utf8');
const pdf = fs.readFileSync(new URL('../../src/services/pdfImportBrowser.ts', import.meta.url), 'utf8');
const model = fs.readFileSync(new URL('../../src/services/pdfImportModel.ts', import.meta.url), 'utf8');
const builder = fs.readFileSync(new URL('../../src/components/template-builder/TemplateBuilder.tsx', import.meta.url), 'utf8');

assert.match(pdf, /GlobalWorkerOptions\.workerSrc/);
assert.match(pdf, /renderPdfPageToCanvas/);
assert.match(pdf, /getAnnotations/);
assert.match(pdf, /annotation\.subtype/);
assert.match(modal, /PdfMappingPreview/);
assert.match(modal, /onManualRegion/);
assert.match(modal, /Add to proposal/);
assert.match(modal, /selectedPdfComponentId/);
assert.match(modal, /onPageChange/);
assert.match(modal, /pdfZoom/);
assert.match(modal, /PDF geometry remains source evidence only/);
assert.match(builder, /source: _source/);
assert.match(pdf, /PDF_NO_TEXT_LAYER/);
assert.match(pdf, /lineSource\(line\)/);
assert.match(pdf, /sourceId: line.id/);
assert.match(modal, /PDF Coverage/);
assert.match(modal, /Page \{page.page\}/);
assert.match(modal, /Unmapped source content/);
assert.match(pdf, /type: 'signature'/);
assert.doesNotMatch(pdf, /requiredRole:/);
assert.match(model, /reconstructPdfLines/);

console.log('phase2b.2 PDF mapping checks passed');
