import assert from 'node:assert/strict';
import { ReportPersistenceCoordinator } from '../../src/features/reports/reportPersistenceCoordinator.ts';
import { buildAssetGatewayUploadBody } from '../../src/services/apiService.ts';

const canonicalId = '11111111-1111-4111-8111-111111111111';
let createCalls = 0;
let releaseCreation!: () => void;
const creationGate = new Promise<void>((resolve) => {
  releaseCreation = resolve;
});

const coordinator = new ReportPersistenceCoordinator(async () => {
  createCalls += 1;
  await creationGate;
  return { id: canonicalId };
});

const first = coordinator.ensure({ templateId: 'template-1' });
const second = coordinator.ensure({ templateId: 'template-1' });
assert.equal(createCalls, 1, 'concurrent ensure calls must create one Report');
releaseCreation();
const [firstReport, secondReport] = await Promise.all([first, second]);
assert.equal(firstReport.id, canonicalId);
assert.equal(secondReport.id, canonicalId);

const thirdReport = await coordinator.ensure({ templateId: 'template-1' });
assert.equal(thirdReport.id, canonicalId);
assert.equal(createCalls, 1, 'later attachments must reuse the canonical Report');

const body = buildAssetGatewayUploadBody({
  filename: 'supporting-document.pdf',
  mimeType: 'application/pdf',
  base64Data: 'data:application/pdf;base64,JVBERg==',
  purpose: 'report_attachment',
  linkedReportId: firstReport.id,
});

assert.deepEqual(body, {
  filename: 'supporting-document.pdf',
  mimeType: 'application/pdf',
  base64Data: 'data:application/pdf;base64,JVBERg==',
  purpose: 'report_attachment',
  linkedReportId: canonicalId,
});

console.log('phase085 report persistence runtime checks passed');
