import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyDocxTableRows } from '../../src/services/docxImportModel.ts';

const importer = fs.readFileSync(new URL('../../src/services/templateImportBrowser.ts', import.meta.url), 'utf8');
const modal = fs.readFileSync(new URL('../../src/components/template-builder/StudioWelcomeModal.tsx', import.meta.url), 'utf8');
const builder = fs.readFileSync(new URL('../../src/components/template-builder/TemplateBuilder.tsx', import.meta.url), 'utf8');

// An irregular/merged form table must stay structural rather than becoming one paragraph.
assert.equal(classifyDocxTableRows([
  'Temporary\t\tPermanent\t',
  'From\t\tTo\t',
  'EIS Member\tAhmed Yassin\tSignature\t',
]), 'FORM_GRID');

// Image context is local to the image's semantic container/nearby row, not document-wide.
assert.match(importer, /closest\('td,th'\)/);
assert.match(importer, /closest\('p,li'\)/);
assert.match(importer, /containerText/);
assert.match(importer, /row\.querySelectorAll\('td,th'\)\.length <= 4/);
assert.doesNotMatch(importer, /parentElement\?\.parentElement\?\.textContent/);
assert.match(importer, /contentImageNodes/);
assert.match(importer, /isPairedFallbackNode/);

// A later sign-off label cannot contaminate earlier content images.
assert.match(importer, /signatureContext = \/signature\|signed\\s\*by\|sign\[- \]\?off/);
assert.match(importer, /classification: 'DOCUMENT_CONTENT_IMAGE'/);
assert.match(importer, /status: 'source_sample_image'/);

// Form candidates remain separate and filled values are provenance-marked samples.
assert.match(importer, /Allocation Type/);
assert.match(importer, /Temporary.*Permanent/);
assert.match(importer, /sampleValue/);
assert.match(importer, /type === 'signature'/);
assert.match(importer, /\? 'date'/);

// Samples are scrubbed again at proposal application, and new imports can obtain a canonical UUID.
assert.match(builder, /sourceSampleValues/);
assert.match(builder, /scrubSourceSamples/);
assert.match(builder, /onEnsureTemplateDraft/);
assert.match(builder, /id: importedTpl\.id \|\| templateState\.id/);
assert.match(modal, /onEnsureTemplateDraft\(\)/);
assert.match(modal, /setResolvedImportTemplateId/);
assert.match(modal, /linkedTemplateId: effectiveTemplateId/);

console.log('phase2a.3.2 DOCX real classification checks passed');
