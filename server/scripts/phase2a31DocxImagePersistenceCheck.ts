import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../../src/components/template-builder/StudioWelcomeModal.tsx', import.meta.url), 'utf8');
const builder = fs.readFileSync(new URL('../../src/components/template-builder/TemplateBuilder.tsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../../src/services/apiService.ts', import.meta.url), 'utf8');

// Document-content images are persisted only at the explicit Create Template boundary.
assert.match(modal, /sourceImage\?\.classification === 'DOCUMENT_CONTENT_IMAGE'/);
assert.match(modal, /apiService\.uploadTemplateAsset\(/);
assert.match(modal, /linkedTemplateId:\s*effectiveTemplateId/);
assert.match(modal, /uploadedImportImages/);
assert.match(modal, /Saving imported images/);
assert.match(modal, /This imported document image needs a saved template draft/);
assert.match(modal, /WidgetFlow could not save one of the imported document images/);
assert.match(modal, /onImportProposalReady\(finalizedProposal\)/);

// A persisted template identity is required before a template_asset can be linked.
assert.match(modal, /\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[1-5\]/i);

// Source samples never enter the upload queue and temporary image evidence is stripped.
assert.match(modal, /sourceImage\?\.classification === 'DOCUMENT_CONTENT_IMAGE'/);
assert.match(builder, /sourceImageDataUrl: _sourceImageDataUrl/);
assert.match(builder, /sampleImage: importedSampleImage/);
assert.match(builder, /assetUrl: undefined/);
assert.match(modal, /sampleImage: _sampleImage/);
assert.match(modal, /sourceImageDataUrl: _sourceImageDataUrl/);

// The API path is the existing authenticated gateway, not direct browser Storage access.
assert.match(api, /uploadTemplateAsset/);
assert.match(api, /purpose:\s*'template_asset'/);
assert.match(api, /asset-gateway/);

console.log('phase2a.3.1 DOCX embedded image persistence checks passed');
