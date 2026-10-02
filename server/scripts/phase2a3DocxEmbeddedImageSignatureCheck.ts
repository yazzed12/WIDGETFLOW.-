import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyDocxTableRows } from '../../src/services/docxImportModel.ts';

const importer = fs.readFileSync(new URL('../../src/services/templateImportBrowser.ts', import.meta.url), 'utf8');
const builder = fs.readFileSync(new URL('../../src/components/template-builder/TemplateBuilder.tsx', import.meta.url), 'utf8');
const modal = fs.readFileSync(new URL('../../src/components/template-builder/StudioWelcomeModal.tsx', import.meta.url), 'utf8');

assert.equal(classifyDocxTableRows(['Temporary\tPermanent', 'From:\t2026-01-01', 'To:\t2026-02-01', 'EIS Member\tAhmed Yassin', 'Signature\t']), 'FORM_GRID');
assert.equal(classifyDocxTableRows(['Quantity\tItem\tSerial No#', '1\tLaptop\tABC123', '1\tHeadset\tNIA']), 'DATA_TABLE');
assert.match(importer, /convertImage/);
assert.match(importer, /Embedded document image detected/);
assert.match(importer, /source_sample_image/);
assert.match(importer, /Garbled fallback text associated with an embedded image was suppressed/);
assert.match(importer, /sampleImage/);
assert.match(importer, /Signature candidate detected/);
assert.match(importer, /Date/);
assert.match(importer, /Employee Number|employee|serial/i);
assert.match(importer, /employee\\s\*\(number\|id\)/);
assert.match(builder, /sampleImage/);
assert.match(builder, /sourceImageDataUrl/);
assert.match(builder, /assetUrl: undefined/);
assert.match(modal, /Embedded document image/);
assert.match(modal, /Source value detected/);
console.log('phase2a.3 DOCX embedded image/signature checks passed');
