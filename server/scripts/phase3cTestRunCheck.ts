import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getNotSimulatedTemplateFields, getTemplateTestRunFields, validateTemplateTestRun } from '../../src/components/dynamic-template/templateTestRun';
import type { WidgetTemplate } from '../../src/types';

const template = {
  id: 'local-template',
  name: 'Unsaved test template',
  components: [
    { id: 'component-a', key: 'employee_name', type: 'text', label: 'Employee name', required: true },
    { id: 'component-b', key: 'notes', type: 'textarea', label: 'Notes' },
    { id: 'component-c', key: 'amount', type: 'currency', label: 'Amount', required: true, validation: { min: 10, max: 100 } },
    { id: 'component-d', key: 'status', type: 'select', label: 'Status', options: [{ label: 'Open', value: 'open' }, { label: 'Closed', value: 'closed' }] },
    { id: 'component-e', key: 'done', type: 'checkbox', label: 'Done', required: true },
    { id: 'component-f', key: 'evidence', type: 'file', label: 'Evidence', required: true },
    { id: 'component-g', key: 'approval', type: 'signature', label: 'Approval', required: true },
  ],
  fields: [],
} as unknown as WidgetTemplate;

const testable = getTemplateTestRunFields(template);
assert.deepEqual(testable.map((field) => field.key), ['employee_name', 'notes', 'amount', 'status', 'done']);
assert.equal(testable.some((field) => field.key === 'component-a'), false, 'component id must not become report value identity');
assert.deepEqual(getNotSimulatedTemplateFields(template).map((field) => field.type), ['file', 'signature']);

const emptyErrors = validateTemplateTestRun(template, {});
assert.equal(emptyErrors.employee_name, 'Employee name is required.');
assert.equal(emptyErrors.amount, 'Amount is required.');
assert.equal(emptyErrors.done, 'Done must be checked.');
assert.equal(emptyErrors.evidence, undefined, 'file action is excluded from simulation validation');
assert.equal(emptyErrors.approval, undefined, 'signature action is excluded from simulation validation');

const validErrors = validateTemplateTestRun(template, {
  employee_name: 'Ahmed',
  amount: 125,
  status: 'open',
  done: true,
});
assert.equal(validErrors.employee_name, undefined);
assert.equal(validErrors.status, undefined);
assert.equal(validErrors.done, undefined);
assert.equal(validErrors.amount, 'Amount cannot exceed 100.');

const modal = readFileSync(new URL('../../src/components/template-builder/TemplateTestRunModal.tsx', import.meta.url), 'utf8');
const builder = readFileSync(new URL('../../src/components/template-builder/TemplateBuilder.tsx', import.meta.url), 'utf8');
const componentRenderer = readFileSync(new URL('../../src/components/dynamic-template/TemplateComponentRenderer.tsx', import.meta.url), 'utf8');
const fileControl = readFileSync(new URL('../../src/components/dynamic-template/FileAttachmentControl.tsx', import.meta.url), 'utf8');
const signatureRenderer = readFileSync(new URL('../../src/components/dynamic-template/SignatureRenderer.tsx', import.meta.url), 'utf8');
const dynamicRenderer = readFileSync(new URL('../../src/components/dynamic-template/DynamicTemplateRenderer.tsx', import.meta.url), 'utf8');
const tableRenderer = readFileSync(new URL('../../src/components/dynamic-template/TableV2Renderer.tsx', import.meta.url), 'utf8');

assert.match(modal, /validateTemplateTestRun\(template, values\)/);
assert.match(modal, /simulationMode/);
assert.match(modal, /setValues\(\{\}\)/, 'Reset Test Data clears only transient local values');
assert.match(builder, /template=\{templateState\}/, 'Test Run receives current unsaved Studio state');
assert.match(builder, /showTestRun && !isAdminPackMode/);
assert.match(modal, /useState<Record<string, unknown>>\(\{\}\)/, 'each mount starts with fresh values');
assert.match(modal, /simulationMode\s*\n\s*onChange=\{setValues\}/);
assert.match(dynamicRenderer, /simulationMode && isNonInteractiveContent/, 'content components render without a field key during simulation');
assert.match(dynamicRenderer, /getLayoutWidthPercent\(normalizedComponent\)/);
assert.match(dynamicRenderer, /resolveEffectiveTheme/);
assert.match(dynamicRenderer, /mode=\{mode\}/);
assert.match(tableRenderer, /mode === 'edit'/, 'simulation uses the existing editable table renderer');
assert.match(componentRenderer, /FileAttachmentControl[\s\S]*simulationMode=\{simulationMode\}/);
assert.match(fileControl, /if \(simulationMode\)[\s\S]*File upload is available when filling a real report\./);
assert.match(signatureRenderer, /Signature action is evaluated during the real report workflow\./);
assert.doesNotMatch(modal, /reportService|create_report_from_template|complete_report|uploadAsset|ensureReportId|signatureService|submit_report|send_report/);
assert.doesNotMatch(modal, /reportId=\{/);
assert.match(signatureRenderer, /if \(reportId && uploadedAssetId/);
assert.ok(fileControl.indexOf('if (simulationMode)') < fileControl.indexOf('const handleFileSelected'), 'simulation exits before file selection can trigger upload');

console.log('Phase 3C Test Run checks passed: report-fill validation is reused, test values use business keys, file/signature actions are excluded, and no persistence/lifecycle path is wired.');
