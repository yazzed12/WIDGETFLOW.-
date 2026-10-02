import assert from 'node:assert/strict';
import fs from 'node:fs';

const builder = fs.readFileSync('src/components/template-builder/TemplateBuilder.tsx', 'utf8');
const properties = fs.readFileSync('src/components/template-builder/PropertiesPanel.tsx', 'utf8');
const api = fs.readFileSync('src/services/apiService.ts', 'utf8');
const contract = fs.readFileSync('src/features/templates/templateAssetUpload.ts', 'utf8');
const gateway = fs.readFileSync('supabase/functions/asset-gateway/index.ts', 'utf8');
const reportAttachment = fs.readFileSync('src/components/dynamic-template/FileAttachmentControl.tsx', 'utf8');
const serializer = fs.readFileSync('src/features/templates/mappers/templateSerializer.ts', 'utf8');

assert.match(builder, /ensureTemplateDraftForAssetUpload/);
assert.match(builder, /templateService\.saveDraft\(\{ \.\.\.templateState, id: '' \}\)/);
assert.match(builder, /if \(isCanonicalTemplateUuid\(templateState\.id\)\) return templateState\.id/);
assert.match(builder, /onEnsureTemplateDraft=\{ensureTemplateDraftForAssetUpload\}/);
assert.match(properties, /const linkedTemplateId = await onEnsureTemplateDraft\(\)/);
assert.match(properties, /linkedTemplateId \}\);/);
assert.doesNotMatch(properties, /linkedTemplateId: templateState\.id/);
assert.match(properties, /We couldn't upload this image\. Please try again\./);
assert.match(properties, /assetUrl: data\.url,[\s\S]*assetId: data\.id/);
assert.match(api, /buildTemplateAssetUploadBody\(payload\)/);
assert.match(api, /buildAssetGatewayUploadBody\([\s\S]*?return \{ \.\.\.payload \}/);
assert.match(contract, /linkedTemplateId: string/);
assert.match(contract, /throw new Error\('A saved template is required before uploading an image\.'\)/);
assert.match(gateway, /purpose === 'template_asset'[\s\S]*!body\.linkedTemplateId/);
assert.match(gateway, /typeof linkedId !== 'string' \|\| !UUID_RE\.test\(linkedId\)/);
assert.match(reportAttachment, /apiService\.uploadAsset\(/);
assert.match(serializer, /\.\.\.component,[\s\S]*order: globalOrder\+\+/);

console.log('Template asset upload static checks passed.');
