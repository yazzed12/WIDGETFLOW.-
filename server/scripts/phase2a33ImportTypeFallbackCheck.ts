import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../../src/components/template-builder/StudioWelcomeModal.tsx', import.meta.url), 'utf8');
const importer = fs.readFileSync(new URL('../../src/services/templateImportBrowser.ts', import.meta.url), 'utf8');
const builder = fs.readFileSync(new URL('../../src/components/template-builder/TemplateBuilder.tsx', import.meta.url), 'utf8');

// Import Analysis exposes every canonical type the importer can produce.
assert.match(modal, /'paragraph','table','image','signature'/);
assert.match(modal, /value=\{component\.type\}/);
assert.match(modal, /updateImportedComponent\(component\.id, \{ type:/);

// Reviewed types are preserved into the final proposal; no valid image/signature coercion exists.
assert.match(builder, /component\.type/);
assert.match(builder, /sampleImage: importedSampleImage/);
assert.match(importer, /makeComponent\('image'/);
assert.match(importer, /makeComponent\('signature'/);
assert.doesNotMatch(builder, /type:\s*'text'[^\n]*component\.type/);

// Fallback removal is local and paired to exact image containers, not language-based.
assert.match(importer, /contentImageNodes/);
assert.match(importer, /sourceSampleImageNodes/);
assert.match(importer, /neighborContainsImage/);
assert.match(importer, /isPairedFallbackNode/);
assert.match(importer, /punctuationRatio/);
assert.match(importer, /[\\u0600-\\u06ff]/);

// Existing canonical image persistence and signature safety remain in place.
assert.match(modal, /sourceImage\?\.classification === 'DOCUMENT_CONTENT_IMAGE'/);
assert.match(modal, /apiService\.uploadTemplateAsset/);
assert.match(modal, /linkedTemplateId: effectiveTemplateId/);
assert.match(importer, /status: 'source_sample_image'/);
assert.match(importer, /classification: 'DOCUMENT_CONTENT_IMAGE'/);

console.log('phase2a.3.3 import type/fallback checks passed');
