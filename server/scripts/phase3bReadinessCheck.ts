import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getTemplateReadinessResult } from '../../src/utils/templateReadiness.js';
import type { WidgetTemplate } from '../../src/types/index.js';

const builderSource = fs.readFileSync('src/components/template-builder/TemplateBuilder.tsx', 'utf8');
assert.match(builderSource, /const readinessResult = getTemplateReadinessResult/);
assert.match(builderSource, /setShowReadinessPanel\(true\)/);
assert.match(builderSource, /if \(!validateDraftMetadata\(\)\) return;/);
assert.match(builderSource, /onReadiness=\{\(\) => setShowReadinessPanel\(true\)\}/);

const base = (components: any[] = []): WidgetTemplate => ({
  id: 'tpl-readiness', name: 'Readiness Example', description: '', categoryId: 'cat-1', version: 'v1', status: 'Draft',
  createdById: 'user-1', createdByName: 'User', createdByRole: 'Employee', createdAt: '', updatedAt: '', tags: [],
  sections: ['General'], dynamicSections: [{ id: 'section-1', title: 'General', order: 0, components }], fields: components as any, components,
});

const valid = base([{ id: 'field-1', type: 'text', key: 'project_code', label: 'Project Code', order: 0, section: 'General' }]);
assert.equal(getTemplateReadinessResult(valid, { categoryIsActive: true }).state, 'ready');
assert.equal(getTemplateReadinessResult(base([{ id: 'field-1', type: 'text', key: 'x', label: '', order: 0 }]), { categoryIsActive: true }).errors.some((i) => i.code === 'FIELD_LABEL_REQUIRED'), true);
assert.equal(getTemplateReadinessResult(base([{ id: 'a', type: 'text', key: 'same', label: 'A', order: 0 }, { id: 'b', type: 'text', key: 'same', label: 'B', order: 1 }]), { categoryIsActive: true }).errors.some((i) => i.code === 'DUPLICATE_FIELD_KEY'), true);
assert.equal(getTemplateReadinessResult(base([{ id: 'choice', type: 'select', key: 'choice', label: 'Choice', order: 0 }]), { categoryIsActive: true }).errors.some((i) => i.code === 'CHOICE_OPTIONS_REQUIRED'), true);
assert.equal(getTemplateReadinessResult(base([{ id: 'table', type: 'table', key: 'table', label: 'Table', order: 0, columns: [] }]), { categoryIsActive: true }).errors.some((i) => i.code === 'TABLE_COLUMNS_REQUIRED'), true);
assert.equal(getTemplateReadinessResult(base([{ id: 'image', type: 'image', key: 'logo', label: 'Logo', order: 0 }]), { categoryIsActive: true }).errors.some((i) => i.code === 'IMAGE_ASSET_REQUIRED'), true);
assert.equal(getTemplateReadinessResult(base([{ id: 'sig', type: 'signature', key: 'approval_signature', label: 'Approval Signature', order: 0, signatureConfig: { signatureRole: 'Sender', assignmentPolicy: 'report_creator_required' } }]), { categoryIsActive: true }).errors.some((i) => i.code === 'SIGNATURE_CONFIGURATION_REQUIRED'), true);
assert.equal(getTemplateReadinessResult(base([{ id: 'sig', type: 'signature', key: 'approval_signature', label: 'Approval Signature', order: 0, signatureConfig: { signatureRole: 'Sender', assignmentPolicy: 'fixed' } }]), { categoryIsActive: true }).errors.some((i) => i.code === 'SIGNATURE_CONFIGURATION_REQUIRED'), false);
assert.equal(getTemplateReadinessResult(base([{ id: 'unknown', type: 'legacy_widget', key: 'legacy', label: 'Legacy', order: 0 }]), { categoryIsActive: true }).errors.some((i) => i.code === 'UNSUPPORTED_COMPONENT'), true);
assert.equal(getTemplateReadinessResult(base([{ id: 'imported', type: 'text', key: 'imported', label: 'Imported', order: 0, sampleValue: 'demo' }]), { categoryIsActive: true }).errors.some((i) => i.code === 'TEMP_IMPORT_METADATA_PRESENT'), true);
assert.equal(getTemplateReadinessResult(base([{ id: 'paragraph', type: 'paragraph', key: 'body', label: 'Body', order: 0, paragraphConfig: { contentHtml: '<p>Text</p>' } }]), { categoryIsActive: true }).errors.some((i) => i.code === 'FIELD_LABEL_REQUIRED'), false);
assert.equal(getTemplateReadinessResult({ ...valid, name: '' }, { categoryIsActive: true }).errors.some((i) => i.code === 'TEMPLATE_NAME_REQUIRED'), true);
assert.equal(getTemplateReadinessResult(valid, { categoryIsActive: false }).errors.some((i) => i.code === 'TEMPLATE_CATEGORY_REQUIRED'), true);
const withEmptySection = { ...valid, dynamicSections: [...valid.dynamicSections!, { id: 'empty', title: 'Empty', order: 1, components: [] }] };
assert.equal(getTemplateReadinessResult(withEmptySection, { categoryIsActive: true }).warnings.some((i) => i.code === 'EMPTY_SECTION'), true);
const warningOnly = getTemplateReadinessResult(withEmptySection, { categoryIsActive: true });
assert.equal(warningOnly.state, 'needs_attention');
assert.equal(getTemplateReadinessResult({ ...valid, dynamicSections: [] }, { categoryIsActive: true }).state, 'blocked');

console.log('phase3b readiness checks passed');
