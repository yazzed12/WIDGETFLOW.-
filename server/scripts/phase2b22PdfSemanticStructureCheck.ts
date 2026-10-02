import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reconstructPdfLogicalLines } from '../../src/services/pdfImportModel.ts';

const importer = fs.readFileSync(new URL('../../src/services/pdfImportBrowser.ts', import.meta.url), 'utf8');
const model = fs.readFileSync(new URL('../../src/services/pdfImportModel.ts', import.meta.url), 'utf8');
const builder = fs.readFileSync(new URL('../../src/components/template-builder/TemplateBuilder.tsx', import.meta.url), 'utf8');

const fixture = [
  { id: 'summary', page: 1, text: 'SUMMARY', y: 100, items: [{ text: 'SUMMARY', x: 40, y: 100, width: 70, height: 16, page: 1 }] },
  { id: 'prose-1', page: 1, text: 'Developed a full-stack clinic management system', y: 125, items: [{ text: 'Developed a full-stack clinic management system', x: 40, y: 125, width: 280, height: 11, page: 1 }] },
  { id: 'prose-2', page: 1, text: 'with role-based user management and reporting.', y: 137, items: [{ text: 'with role-based user management and reporting.', x: 40, y: 137, width: 260, height: 11, page: 1 }] },
  { id: 'skills', page: 1, text: 'TECHNICAL SKILLS', y: 180, items: [{ text: 'TECHNICAL SKILLS', x: 40, y: 180, width: 130, height: 16, page: 1 }] },
  { id: 'bullet-1', page: 1, text: '• Frontend Development', y: 205, items: [{ text: '• Frontend Development', x: 40, y: 205, width: 150, height: 11, page: 1 }] },
  { id: 'bullet-2', page: 1, text: '• Web Technologies', y: 220, items: [{ text: '• Web Technologies', x: 40, y: 220, width: 130, height: 11, page: 1 }] },
  { id: 'projects', page: 1, text: 'PROJECTS', y: 260, items: [{ text: 'PROJECTS', x: 40, y: 260, width: 70, height: 16, page: 1 }] },
];
const logical = reconstructPdfLogicalLines(fixture);
assert.equal(logical.find((line) => line.id === 'prose-1')?.sourceIds?.length, 2, 'wrapped prose should retain both source lines');
assert.equal(logical.find((line) => line.id === 'prose-1')?.text, 'Developed a full-stack clinic management system with role-based user management and reporting.');
assert.equal(logical.filter((line) => line.text.startsWith('•')).length, 2, 'separate bullets remain separate');
assert.match(model, /reconstructPdfLogicalLines/);
assert.match(importer, /documentLike/);
assert.match(importer, /strongFieldEvidence/);
assert.match(importer, /headingCandidate/);
assert.match(importer, /sourceIds/);
assert.match(importer, /tableHeaders/);
assert.match(importer, /annotation\.fieldType === 'Tx'/);
assert.match(builder, /sourceSampleValues/);
assert.match(builder, /scrubSourceSamples/);

console.log('phase2b.2.2 PDF semantic structure checks passed');
