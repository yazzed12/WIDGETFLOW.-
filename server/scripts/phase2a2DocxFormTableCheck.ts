import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyDocxTableRows } from '../../src/services/docxImportModel.ts';

const source = fs.readFileSync(new URL('../../src/services/templateImportBrowser.ts', import.meta.url), 'utf8');
const modal = fs.readFileSync(new URL('../../src/components/template-builder/StudioWelcomeModal.tsx', import.meta.url), 'utf8');

assert.equal(classifyDocxTableRows([
  'Full Name:\tTaher Ahmed\tDept Head/Manager:\tSherine Zaki',
  'Employee Number:\tCWMT0000064374\tDepartment/Directorate:\tEHS',
  'User ID\ttra62172\tBuilding Name/Location:\tAdmin',
]), 'FORM_GRID');
assert.equal(classifyDocxTableRows([
  'Quantity\tItem\tSerial No#',
  '1\tLaptop\tABC123',
  '1\tHeadset\tNIA',
  '1\tBag\tNIA',
]), 'DATA_TABLE');
assert.equal(classifyDocxTableRows(['English responsibility clause\tمسؤولية المعدات', 'Keep equipment safe\tالحفاظ على المعدات']), 'CONTENT_TABLE');
assert.match(source, /sampleValue/);
assert.match(source, /sampleRows/);
assert.match(source, /source_sample/);
assert.match(source, /Word list content/);
assert.match(source, /Signature candidate detected/);
assert.match(source, /withAutoDirection/);
assert.match(source, /unresolvedCount/);
assert.match(modal, /Source value detected/);
assert.match(modal, /populated sample row/);
console.log('phase2a.2 DOCX form/table checks passed');
