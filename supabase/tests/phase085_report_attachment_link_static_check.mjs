import assert from 'node:assert/strict';
import fs from 'node:fs';

const context = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
const modal = fs.readFileSync('src/components/reports/FillReportModal.tsx', 'utf8');
const renderer = fs.readFileSync('src/components/dynamic-template/DynamicTemplateRenderer.tsx', 'utf8');
const componentRenderer = fs.readFileSync('src/components/dynamic-template/TemplateComponentRenderer.tsx', 'utf8');
const control = fs.readFileSync('src/components/dynamic-template/FileAttachmentControl.tsx', 'utf8');
const api = fs.readFileSync('src/services/apiService.ts', 'utf8');
const gateway = fs.readFileSync('supabase/functions/asset-gateway/index.ts', 'utf8');

assert.match(context, /new ReportPersistenceCoordinator<ReportInstance>/);
assert.match(context, /reportPersistenceRef\.current\.ensure\(payload\)/);
assert.match(modal, /ensureReportId=\{async \(\) => \(await ensurePersistedReport\(\)\)\.id\}/);
assert.match(modal, /reportId=\{reportToEdit\?\.id\}/);
assert.match(renderer, /ensureReportId=\{ensureReportId\}/);
assert.match(componentRenderer, /<FileAttachmentControl[\s\S]*?ensureReportId=\{ensureReportId\}/);
assert.match(control, /const canonicalReportId = reportId \?\? await ensureReportId\?\.\(\)/);
assert.match(control, /purpose: 'report_attachment',[\s\S]*?linkedReportId: canonicalReportId/);
assert.doesNotMatch(control, /Save the report before adding attachments\./);
assert.match(api, /const body = buildAssetGatewayUploadBody\(payload\)/);
assert.match(api, /functions\.invoke\('asset-gateway', \{ body \}\)/);
assert.match(gateway, /!body\.linkedReportId/);
assert.match(gateway, /'ASSET_LINK_REQUIRED'/);
assert.match(gateway, /linked_report_id:/);

console.log('phase085 report attachment persistence/link checks passed');
