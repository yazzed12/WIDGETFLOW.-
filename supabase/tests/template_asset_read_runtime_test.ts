import assert from 'node:assert/strict';
import { resolveAssetUrl } from '../../src/shared/display-tools/displayUtils.ts';
import { deserializeTemplateRow, serializeTemplateDraft } from '../../src/features/templates/mappers/templateSerializer.ts';

const metadataAssetId = 'c8b7f500-46d8-406a-9050-d429823cad05';

assert.equal(resolveAssetUrl(metadataAssetId, metadataAssetId), `/api/assets/${metadataAssetId}`);
assert.equal(resolveAssetUrl(undefined, metadataAssetId), `/api/assets/${metadataAssetId}`);
assert.equal(resolveAssetUrl(`/api/assets/${metadataAssetId}`, metadataAssetId), `/api/assets/${metadataAssetId}`);
assert.equal(resolveAssetUrl('https://cdn.example.test/logo.png', metadataAssetId), 'https://cdn.example.test/logo.png');
assert.equal(resolveAssetUrl(undefined, 'company_logo'), '');
assert.equal(resolveAssetUrl(undefined, 'component-123'), '');

const imageComponent = {
  id: 'image-field-id',
  key: 'company_logo',
  label: 'Company logo',
  type: 'image',
  assetId: metadataAssetId,
  assetUrl: `/api/assets/${metadataAssetId}`,
  imageConfig: { assetId: metadataAssetId, assetUrl: `/api/assets/${metadataAssetId}` },
};
const serialized = serializeTemplateDraft({
  id: '6f3b781f-961a-4d74-8b90-2c65eaeac391',
  name: 'Asset round trip',
  categoryId: 'category-id',
  dynamicSections: [{ id: 'section-id', title: 'General', order: 0, components: [imageComponent] }],
} as any);
assert.equal(serialized.sections[0].components[0].assetId, metadataAssetId);
assert.equal(serialized.sections[0].components[0].assetUrl, `/api/assets/${metadataAssetId}`);
assert.equal(serialized.sections[0].components[0].imageConfig?.assetId, metadataAssetId);
assert.equal(serialized.sections[0].components[0].imageConfig?.assetUrl, `/api/assets/${metadataAssetId}`);

const reopened = deserializeTemplateRow(
  { id: '6f3b781f-961a-4d74-8b90-2c65eaeac391', name: 'Asset round trip', category_id: 'category-id', status: 'draft' },
  [{ id: 'section-id', template_id: '6f3b781f-961a-4d74-8b90-2c65eaeac391', name: 'General', display_order: 0 }],
  [{ id: 'image-field-id', template_id: '6f3b781f-961a-4d74-8b90-2c65eaeac391', section_id: 'section-id', field_key: 'company_logo', label: 'Company logo', field_type: 'image', display_order: 0, configuration: imageComponent }],
);
assert.equal(reopened.components[0].assetId, metadataAssetId);
assert.equal(reopened.components[0].assetUrl, `/api/assets/${metadataAssetId}`);
assert.equal(reopened.components[0].imageConfig?.assetId, metadataAssetId);
assert.equal(reopened.components[0].imageConfig?.assetUrl, `/api/assets/${metadataAssetId}`);

console.log('Template asset read resolution runtime tests passed.');
