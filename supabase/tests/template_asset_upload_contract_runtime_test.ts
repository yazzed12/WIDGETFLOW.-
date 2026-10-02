import assert from 'node:assert/strict';
import { buildTemplateAssetUploadBody, isCanonicalTemplateUuid } from '../../src/features/templates/templateAssetUpload.ts';
import { serializeTemplateDraft, deserializeTemplateRow } from '../../src/features/templates/mappers/templateSerializer.ts';

const templateId = '5d173147-8086-4d82-aec8-9787f36e4ef2';
assert.equal(isCanonicalTemplateUuid(templateId), true);
assert.equal(isCanonicalTemplateUuid('tpl-1727000000000'), false);
assert.equal(isCanonicalTemplateUuid('TMP-EM012-MG007-2026-000042'), false);
assert.equal(isCanonicalTemplateUuid('image-logo'), false);

const uploadBody = buildTemplateAssetUploadBody({
  filename: 'brand.png',
  mimeType: 'image/png',
  base64Data: 'data:image/png;base64,AA==',
  linkedTemplateId: templateId,
});
assert.equal(uploadBody.linkedTemplateId, templateId);
assert.equal(uploadBody.purpose, 'template_asset');
assert.throws(() => buildTemplateAssetUploadBody({
  base64Data: 'data:image/png;base64,AA==',
  linkedTemplateId: 'tpl-1727000000000',
}), /saved template/);
assert.throws(() => buildTemplateAssetUploadBody({
  base64Data: 'data:image/png;base64,AA==',
  linkedTemplateId: 'TMP-EM012-MG007-2026-000042',
}), /saved template/);
assert.throws(() => buildTemplateAssetUploadBody({
  base64Data: 'data:image/png;base64,AA==',
  linkedTemplateId: '' as string,
}), /saved template/);
assert.throws(() => buildTemplateAssetUploadBody({
  base64Data: 'data:image/png;base64,AA==',
  linkedTemplateId: undefined as any,
}), /saved template/);

const component = {
  id: 'component-logo',
  key: 'company_logo',
  type: 'image' as const,
  label: 'Company logo',
  required: false,
  assetId: 'asset-row-id',
  assetUrl: '/api/assets/asset-row-id',
  imageConfig: { assetId: 'asset-row-id', assetUrl: '/api/assets/asset-row-id' },
};
const serialized = serializeTemplateDraft({
  id: templateId,
  name: 'Test template',
  description: '',
  categoryId: 'category-id',
  tags: [],
  status: 'Draft',
  sections: ['General'],
  dynamicSections: [{ id: 'section-id', title: 'General', order: 0, components: [component] }],
  components: [component],
  fields: [component] as any,
} as any);
assert.equal(serialized.id, templateId);
assert.equal((serialized.sections[0].components[0] as any).imageConfig.assetId, 'asset-row-id');
assert.equal((serialized.sections[0].components[0] as any).imageConfig.assetUrl, '/api/assets/asset-row-id');

const restored = deserializeTemplateRow(
  { id: templateId, name: 'Test template', category_id: 'category-id', status: 'draft' },
  [{ id: 'section-id', template_id: templateId, name: 'General', display_order: 0 }],
  [{ id: 'component-db-id', template_id: templateId, section_id: 'section-id', field_key: 'company_logo', label: 'Company logo', field_type: 'image', display_order: 0, configuration: { imageConfig: { assetId: 'asset-row-id', assetUrl: '/api/assets/asset-row-id' } } }],
);
assert.equal(restored.dynamicSections?.[0].components[0].imageConfig?.assetId, 'asset-row-id');
assert.equal(restored.dynamicSections?.[0].components[0].imageConfig?.assetUrl, '/api/assets/asset-row-id');

console.log('Template asset upload contract runtime tests passed.');
