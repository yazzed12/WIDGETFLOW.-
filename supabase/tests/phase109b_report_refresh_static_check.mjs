import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const context = read('src/context/AppContext.tsx');
const fill = read('src/components/reports/FillReportModal.tsx');
const uploaded = read('src/components/reports/UploadedReportModal.tsx');
const reportsPage = read('src/pages/ReportsPage.tsx');
const between = (source, start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Unable to isolate ${start}`);
  return source.slice(from, to);
};
const occurrences = (source) => (source.match(/refreshReports\(\)/g) ?? []).length;

// Save Draft owns one post-save refresh. New report persistence is a separate write.
assert.equal(occurrences(between(fill, 'const handleSaveDraft = async', 'const handleSendReport = async')), 1);
// The AppContext complete action owns the refresh; this component does not repeat it.
assert.equal(occurrences(between(fill, 'const handleSendReport = async', 'return (')), 0);
assert.match(between(context, 'const updateReportInstance = async', 'const markReportCompleted = async'), /await refreshReports\(\); closeFillReportModal\(\)/);
// Uploaded creation and attachment each refresh after their own write; the modal and close handler do not add another.
assert.equal(occurrences(uploaded), 0);
assert.doesNotMatch(reportsPage, /onClose=\{\(\) => \{[^}]*refreshReports\(\)/);

for (const [start, end] of [
  ['const sendReport = async', 'const returnReport = async'],
  ['const returnReport = async', 'const rejectReport = async'],
  ['const rejectReport = async', 'const signReport = async'],
  ['const signReport = async', 'const addReportComment = async'],
]) {
  const action = between(context, start, end);
  assert.match(action, /await (?:Promise\.all\(\[)?refreshReports\(\)/);
}
console.log('Phase 109B report mutation refresh static checks passed');
