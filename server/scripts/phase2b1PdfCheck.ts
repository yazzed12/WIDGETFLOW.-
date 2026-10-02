import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reconstructPdfLines } from '../../src/services/pdfImportModel.ts';

const source = fs.readFileSync(new URL('../../src/services/pdfImportBrowser.ts', import.meta.url), 'utf8');
const lines = reconstructPdfLines({ pageCount: 2, warnings: [], pages: [
  { page: 1, width: 600, height: 800, annotations: [], textItems: [
    { page: 1, text: 'Employee', x: 20, y: 100, width: 50, height: 12 },
    { page: 1, text: 'Name:', x: 75, y: 100, width: 35, height: 12 },
    { page: 1, text: 'Safety', x: 20, y: 120, width: 40, height: 12 },
  ] },
  { page: 2, width: 600, height: 800, annotations: [], textItems: [{ page: 2, text: 'Second page', x: 20, y: 100, width: 70, height: 12 }] },
] });
assert.equal(lines.length, 3);
assert.equal(lines[0].text, 'Employee Name:');
assert.equal(lines[1].page, 1);
assert.equal(lines[2].page, 2);
assert.match(source, /getDocument/);
assert.match(source, /getTextContent/);
assert.match(source, /PDF_NO_TEXT_LAYER/);
assert.match(source, /PDF_PASSWORD_REQUIRED/);
assert.match(source, /Scanned PDF import is not supported/);
assert.match(source, /tableHeaders/);
assert.match(source, /source = lineSource/);
assert.doesNotMatch(source, /position:absolute|absolute positioning/);
console.log('phase2b.1 PDF checks passed');
