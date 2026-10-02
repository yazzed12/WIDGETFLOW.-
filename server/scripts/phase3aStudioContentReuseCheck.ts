import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cloneAdminPackForTemplate } from '../../src/components/template-builder/adminPackCanvas.js';
import type { AdminPack, TemplateSection } from '../../src/types/index.js';

const libraryPanel = fs.readFileSync('src/components/template-builder/ContentLibraryPanel.tsx', 'utf8');
const packsPanel = fs.readFileSync('src/components/template-builder/PacksPanel.tsx', 'utf8');
const builder = fs.readFileSync('src/components/template-builder/TemplateBuilder.tsx', 'utf8');
const repository = fs.readFileSync('src/features/configuration/repositories/configurationRepository.ts', 'utf8');

assert.match(libraryPanel, /configurationService\.operationalContentLibrary\(\)/);
assert.match(libraryPanel, /setPreviewItem\(item\)/);
assert.match(libraryPanel, /Insert Content/);
assert.doesNotMatch(libraryPanel, /setError\(err\.message/);
assert.match(repository, /status.*published/);
assert.match(packsPanel, /setPreviewPack\(pack\)/);
assert.doesNotMatch(packsPanel, /setError\(err\.message/);
assert.match(repository, /standard_pack_versions/);
assert.match(repository, /standard_pack_items/);
assert.match(builder, /const insertionIndex = selectedSectionId/);
assert.match(builder, /handleAddTextPreset\(\{ type: 'paragraph', label: item\.contentValue \}, selectedSectionId/);

const sourceSection: TemplateSection = {
  id: 'source-section',
  title: 'Safety',
  order: 0,
  components: [{ id: 'source-component', key: 'check', label: 'Check', type: 'text', section: 'Safety', order: 0 }],
};
const pack = {
  id: 'pack-1', name: 'Safety Pack', description: '', status: 'Published', createdBy: 'admin',
  createdAt: '', updatedAt: '', items: [], structure: [sourceSection],
} as AdminPack;
const existing: TemplateSection[] = [{
  id: 'existing-section', title: 'Existing', order: 0,
  components: [{ id: 'existing-component', key: 'check', label: 'Check', type: 'text', section: 'Existing', order: 0 }],
}];
const inserted = cloneAdminPackForTemplate(pack, existing);
assert.equal(inserted.length, 1);
assert.notEqual(inserted[0].id, sourceSection.id);
assert.notEqual(inserted[0].components[0].id, sourceSection.components[0].id);
assert.equal(inserted[0].components[0].key, 'check_2');
assert.equal(inserted[0].components[0].section, 'Safety');

console.log('phase3a Studio content reuse checks passed');
