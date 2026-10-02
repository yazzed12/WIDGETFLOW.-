import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serializeTemplateDraft, deserializeTemplateRow } from '../../src/features/templates/mappers/templateSerializer';
import { resolveElementAppearance } from '../../src/shared/themeResolver';

const component: any = {
  id: 'component-1',
  type: 'info_box',
  key: 'notice',
  order: 0,
  layout: { width: 'half', widthPercent: 50 },
  appearance: { backgroundColor: '#fff7ed', borderColor: '#f97316', borderWidth: 2, borderStyle: 'solid', borderRadius: 16, padding: 12, textAlign: 'center' },
};

const template: any = {
  id: 'template-1',
  name: 'Design Test',
  description: '',
  categoryId: 'category-1',
  tags: [],
  dynamicSections: [{ id: 'section-1', title: 'General', order: 0, components: [component] }],
  workflow: { rules: [], calculations: [] },
};

const payload = serializeTemplateDraft(template);
assert.deepEqual(payload.sections[0].components[0].appearance, component.appearance);
assert.equal(payload.sections[0].components[0].layout.widthPercent, 50, 'appearance must not change width');

const roundTripped = deserializeTemplateRow(
  { id: 'template-1', name: 'Design Test', category_id: 'category-1', status: 'draft', created_at: '', updated_at: '' },
  [{ id: 'section-1', template_id: 'template-1', name: 'General', display_order: 0 }],
  [{ id: 'component-1', template_id: 'template-1', section_id: 'section-1', field_key: 'notice', label: 'Notice', field_type: 'info_box', display_order: 0, configuration: { appearance: component.appearance, layout: component.layout } }],
);
assert.deepEqual(roundTripped.components[0].appearance, component.appearance);
assert.deepEqual(resolveElementAppearance(roundTripped.components[0]), resolveElementAppearance(component));

const renderer = fs.readFileSync('src/components/dynamic-template/TemplateComponentRenderer.tsx', 'utf8');
const builder = fs.readFileSync('src/components/template-builder/BuilderComponent.tsx', 'utf8');
const panel = fs.readFileSync('src/components/template-builder/AppearanceControls.tsx', 'utf8');
const builderRoot = fs.readFileSync('src/components/template-builder/TemplateBuilder.tsx', 'utf8');
assert.match(renderer, /resolveElementAppearance/);
assert.match(builder, /resolveElementAppearance/);
assert.match(panel, /Reset to Theme/);
assert.match(builderRoot, /templateState\.status === 'Approved'/);

console.log('phase1b design checks passed');
