import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const repository = read('../../src/features/reports/reportRepository.ts');
const service = read('../../src/features/reports/reportService.ts');
const reportsPage = read('../../src/pages/ReportsPage.tsx');
const detail = read('../../src/components/reports/ReportViewModal.tsx');
const sendModal = read('../../src/components/reports/SendReportModal.tsx');
const documents = read('../../src/components/reports/UploadedReportDocument.tsx');
const uploadModal = read('../../src/components/reports/UploadedReportModal.tsx');
const gateway = read('../functions/asset-gateway/index.ts');
const model = read('../../src/types/index.ts');
const authorization = read('../functions/_shared/reportAttachmentAuthorization.ts');
const context = read('../../src/context/AppContext.tsx');
const uploadFiles = read('../../src/features/reports/uploadedReportFiles.ts');

for (const rpc of ['create_uploaded_report', 'attach_uploaded_report_document', 'send_uploaded_report', 'return_uploaded_report']) {
  assert(repository.includes(`rpc('${rpc}'`), `repository must use ${rpc}`);
}
assert(repository.includes("from('report_document_versions').select('*').in('report_id', reportIds)"));
assert(repository.includes("from('report_send_cycles').select('*').in('report_id', reportIds)"));
assert(service.includes("row.source_type === 'uploaded' ? 'uploaded' : 'template'"));
assert(service.includes("sourceType === 'template'"), 'template snapshot mapping must remain source-gated');
assert(model.includes("sourceType: 'template' | 'uploaded'"));
assert(reportsPage.includes('Create from Template') && reportsPage.includes('Upload Existing Report'));
assert(reportsPage.includes("rep.sourceType === 'uploaded' ? 'Uploaded Report' : 'Template Report'"));
assert(uploadModal.includes("purpose: 'report_attachment'"));
assert(uploadModal.includes('linkedReportId: activeReportId'));
assert(uploadModal.includes('createUploadedReport(title.trim())'));
assert(uploadModal.includes('attachUploadedReportDocument(activeReportId!, activeAssetId)'));
assert(sendModal.includes("report.sourceType === 'uploaded'"));
assert(sendModal.includes("isUploadedReport ? [] : Object.entries(signatureMappings)"));
assert(service.includes('sendUploaded(id, recipientIds, note)'));
assert(detail.includes('!isUploadedReport && isMappedSigner'), 'uploaded report must not expose template Sign flow');
assert(detail.includes('report.sourceType'));
assert(documents.includes('cycle?.documentVersionId'));
assert(documents.includes("recipientView ? undefined : versions.find"), 'recipient view must not fall back to current document');
const uploadedMimes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];
for (const mime of uploadedMimes) {
  assert(gateway.includes(`'${mime}'`), `gateway must accept ${mime}`);
  assert(uploadFiles.includes(`'${mime}'`), `frontend must accept ${mime}`);
}
assert(gateway.includes('const MAX_BYTES = 10 * 1024 * 1024'));
assert(uploadFiles.includes('ASSET_GATEWAY_MAX_BYTES = 10 * 1024 * 1024'));
assert(!gateway.includes('application/vnd.ms-excel'), 'legacy XLS support must remain disabled');
assert(gateway.includes('canWriteReportAttachment('));
assert(gateway.includes('requireReportAttachmentWriteAccess('));
assert(authorization.includes("String(report.status).toLowerCase() === 'draft'"));
assert(gateway.includes("mime ===\n    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'"));
assert(gateway.includes("return 'xlsx'"));
assert(uploadModal.includes('const [assetId, setAssetId] = useState<string | null>(null)'));
assert(uploadModal.includes('if (!reportId && !file)'));
assert(uploadModal.includes('if (!activeAssetId && file)'));
assert(!uploadModal.includes('currentDocumentVersionId') && !uploadModal.includes('documentVersions'), 'correction flow must not reuse the previous document asset');
assert(uploadModal.includes('apiService.uploadAsset(') && uploadModal.includes('linkedReportId: activeReportId'));
assert(context.includes('reportService.sendUploaded(reportId'));
assert(context.includes('await reportService.send(reportId'), 'template report send path must remain available');
assert(context.includes('reportService.returnUploaded(reportId'));
assert(context.includes('else await reportService.returnReport(reportId'));
assert(!uploadModal.includes('SmartImport') && !uploadModal.includes('pdfImport'));
assert(!uploadModal.includes('create_report_from_template'));
assert(!uploadModal.includes('insert('), 'uploaded creation must not directly insert database rows');

console.log('PASS: Phase 4B uploaded-report frontend wiring and source isolation');
