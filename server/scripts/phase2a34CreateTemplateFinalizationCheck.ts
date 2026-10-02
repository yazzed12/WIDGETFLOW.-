import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../../src/components/template-builder/StudioWelcomeModal.tsx', import.meta.url), 'utf8');
const builder = fs.readFileSync(new URL('../../src/components/template-builder/TemplateBuilder.tsx', import.meta.url), 'utf8');
const repository = fs.readFileSync(new URL('../../src/features/templates/repositories/templateRepository.ts', import.meta.url), 'utf8');

// The reviewed proposal is captured once, finalized without mutating it, and applied once.
assert.match(modal, /const proposal = importProposal/);
assert.match(modal, /const finalizedProposal =/);
assert.match(modal, /onImportProposalReady\(finalizedProposal\)/);
assert.match(modal, /setImportProposal\(null\)/);

// Empty image queues do not require draft UUID bootstrap or asset uploads.
assert.match(modal, /contentImages.length > 0/);
assert.match(modal, /if \(contentImages\.length > 0 &&/);
assert.match(modal, /apiService\.uploadTemplateAsset\(/);

// Temporary local IDs are omitted from the UUID RPC argument; canonical IDs are reused.
assert.match(builder, /isCanonicalUuid/);
assert.match(builder, /templateService\.saveDraft\(isCanonicalUuid \? templateState : \{ \.\.\.templateState, id: '' \}\)/);
assert.match(repository, /const canonicalId =/);
assert.match(repository, /p_template_id: canonicalId/);

// Loading always terminates and failures leave the proposal available for retry.
assert.match(modal, /setIsUploadingImportImages\(true\)/);
assert.match(modal, /finally \{\s*setIsUploadingImportImages\(false\)/);
assert.match(modal, /Please try again\./);

// Source samples remain excluded from the retained content-image queue.
assert.match(modal, /classification === 'DOCUMENT_CONTENT_IMAGE'/);
assert.match(modal, /!\(component as any\)\.ignored/);

console.log('phase2a.3.4 Create Template finalization checks passed');
