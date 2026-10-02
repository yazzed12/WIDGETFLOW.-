import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reconstructPdfLines } from '../../src/services/pdfImportModel.ts';

const pdf = fs.readFileSync(new URL('../../src/services/pdfImportBrowser.ts', import.meta.url), 'utf8');
const modal = fs.readFileSync(new URL('../../src/components/template-builder/StudioWelcomeModal.tsx', import.meta.url), 'utf8');
const lines = reconstructPdfLines({ pageCount: 1, warnings: [], pages: [{ page: 1, width: 600, height: 800, annotations: [], textItems: [
  { page: 1, text: 'Repeated', x: 20, y: 100, width: 45, height: 12 },
  { page: 1, text: 'Repeated', x: 100, y: 100, width: 45, height: 12 },
  { page: 1, text: 'Instruction: keep visible', x: 20, y: 130, width: 130, height: 12 },
] }] });
assert.equal(lines.length, 2, 'same-line items should reconstruct without dropping text');
assert.match(lines[0].id, /^pdf-source-p1-line-/);
assert.match(lines[0].text, /Repeated/);
assert.match(lines[1].text, /Instruction/);
const columns = reconstructPdfLines({ pageCount: 1, warnings: [], pages: [{ page: 1, width: 600, height: 800, annotations: [], textItems: [
  { page: 1, text: 'Left column', x: 20, y: 200, width: 70, height: 12 },
  { page: 1, text: 'Right column', x: 500, y: 200, width: 75, height: 12 },
] }] });
assert.equal(columns.length, 2, 'widely separated columns must not be merged');
assert.match(pdf, /pdfCoverage/);
assert.match(pdf, /unmappedBlockCount/);
assert.match(pdf, /sourceId: line.id/);
assert.match(modal, /Unmapped source content/);
assert.match(modal, /Add as Paragraph/);
assert.match(modal, /Create Template Anyway/);
assert.match(modal, /updatePdfCoverage/);
console.log('phase2b.2 PDF coverage checks passed');
