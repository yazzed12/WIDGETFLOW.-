import assert from 'node:assert/strict';
import { prepareReportForEditing } from '../../src/features/reports/reportEditPreparation.ts';

type Report = { id: string; detailLoaded: boolean; data: Record<string, string>; signatureConfigurations: string[] };
const summary: Report = { id: 'report-1', detailLoaded: false, data: {}, signatureConfigurations: [] };
const detail: Report = { id: 'report-1', detailLoaded: true, data: { supervisor: 'Hazem' }, signatureConfigurations: ['Director'] };
let detailReads = 0;
const hydrated = await prepareReportForEditing(summary, async (id) => {
  detailReads += 1;
  assert.equal(id, summary.id);
  return detail;
}, () => true, true);
assert.equal(hydrated, detail);
assert.equal(hydrated.data.supervisor, 'Hazem');
assert.deepEqual(hydrated.signatureConfigurations, ['Director']);
assert.equal(detailReads, 1);
await assert.rejects(() => prepareReportForEditing(summary, async () => { throw new Error('lookup failed'); }, () => true, true), /lookup failed/);
await assert.rejects(() => prepareReportForEditing(summary, async () => summary, () => true, true), /REPORT_DETAIL_REQUIRED/);
await assert.rejects(() => prepareReportForEditing(summary, async () => detail, () => false, true), /WORKSPACE_CHANGED/);
assert.equal(await prepareReportForEditing(detail, async () => { throw new Error('unneeded'); }, () => true, true), detail);
console.log('Phase 109B report edit hydration runtime checks passed');
