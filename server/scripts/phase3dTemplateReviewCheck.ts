import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTemplateReviewPackage, getTemplateReviewBaselineId, isCanonicalApprovedBaseline } from '../../src/features/templates/review/templateReviewPackage';
import { deserializeTemplateRow } from '../../src/features/templates/mappers/templateSerializer';
import type { WidgetTemplate } from '../../src/types';

const makeTemplate = (overrides: Partial<WidgetTemplate> = {}): WidgetTemplate => ({
  id: 'template-current', name: 'Operations', description: 'Current description', categoryId: 'cat-new', version: 'v2', status: 'Pending Approval',
  createdById: 'creator', createdByName: 'Creator', createdByRole: 'Employee', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
  supersedesTemplateId: 'template-baseline', sections: ['General'], dynamicSections: [{ id: 'new-section-id', title: 'General', order: 0, components: [] }], components: [], fields: [], theme: {}, ...overrides,
} as WidgetTemplate);

const field = (overrides: Record<string, unknown> = {}) => ({ id: 'stable-field-id', key: 'owner_name', label: 'Owner', type: 'text', required: false, section: 'General', ...overrides });
const baseline = makeTemplate({ id: 'template-baseline', supersedesTemplateId: undefined, version: 'v1', status: 'Approved', categoryId: 'cat-old', name: 'Monthly Operations', description: 'Old description', dynamicSections: [{ id: 'old-section-id', title: 'General', order: 0, components: [field()] }], components: [field()], theme: { accent: 'blue' } });

assert.equal(getTemplateReviewBaselineId(makeTemplate()), 'template-baseline', 'revision baseline resolves only from explicit supersedes relationship');
assert.equal(getTemplateReviewBaselineId(makeTemplate({ supersedesTemplateId: '  ' })), null);
assert.equal(isCanonicalApprovedBaseline(makeTemplate({ status: 'Approved' })), true);
assert.equal(isCanonicalApprovedBaseline(makeTemplate({ status: 'Superseded' })), true);
assert.equal(isCanonicalApprovedBaseline(makeTemplate({ status: 'Draft' })), false);
assert.equal(isCanonicalApprovedBaseline(makeTemplate({ status: 'Rejected' })), false);

const identical = buildTemplateReviewPackage(baseline, baseline, { 'cat-old': 'Operations' });
assert.equal(identical.mode, 'revision');
assert.equal(identical.baselineLabel, 'Approved version v1', 'baseline label uses the exact version label on the compared ancestor row');
assert.deepEqual(identical.changes, [], 'equal snapshots produce no false positives');
const baselineSnapshot = structuredClone(baseline);

const changed = makeTemplate({
  name: 'Updated Operations', description: 'New description', categoryId: 'cat-new', theme: { accent: 'green' },
  dynamicSections: [
    { id: 'new-section-id', title: 'Renamed General', order: 1, components: [field({ key: 'owner', label: 'Responsible owner', required: true, layoutWidth: 'half', placeholder: 'Select owner', options: undefined })] },
    { id: 'new-section-two', title: 'Evidence', order: 0, components: [{ id: 'second-field', key: 'evidence', label: 'Evidence type', type: 'select', options: ['PDF', 'Image'], section: 'Evidence' }] },
  ],
  components: [],
});
const currentSnapshot = structuredClone(changed);
const diff = buildTemplateReviewPackage(changed, baseline, { 'cat-old': 'Old', 'cat-new': 'New' });
const has = (title: string, kind?: string) => diff.changes.some((change) => change.title === title && (!kind || change.kind === kind));
assert.equal(diff.mode, 'revision');
assert.ok(has('Section renamed', 'renamed'));
assert.ok(has('Section added', 'added'));
assert.ok(has('Owner removed', 'removed') === false, 'stable component ID detects field identity through key changes');
assert.ok(has('Business field key changed'));
assert.ok(has('Field label changed'));
assert.ok(has('Required status changed'));
assert.ok(has('Field width changed'));
assert.ok(has('Placeholder changed'));
assert.ok(has('Category changed'));
assert.ok(has('Theme updated · Accent'));
assert.ok(has('Template name changed'));
assert.ok(has('Template description changed'));
assert.ok(diff.changes.some((change) => change.title === 'Evidence type added' && change.after?.includes('Choices: PDF, Image')));
assert.deepEqual(baseline, baselineSnapshot, 'baseline snapshot is not mutated');
assert.deepEqual(changed, currentSnapshot, 'current snapshot is not mutated');

const moveBase = makeTemplate({ status: 'Approved', supersedesTemplateId: undefined, dynamicSections: [{ id: 's1', title: 'General', order: 0, components: [field({ id: 'moving', key: 'moving' })] }, { id: 's2', title: 'Evidence', order: 1, components: [] }] });
const moveNext = makeTemplate({ dynamicSections: [{ id: 'n1', title: 'General', order: 0, components: [] }, { id: 'n2', title: 'Evidence', order: 1, components: [field({ id: 'moving', key: 'moving', section: 'Evidence' })] }] });
assert.ok(buildTemplateReviewPackage(moveNext, moveBase).changes.some((change) => change.kind === 'moved'));

const structureBase = makeTemplate({ status: 'Approved', supersedesTemplateId: undefined, dynamicSections: [{ id: 's1', title: 'First', order: 0, components: [field({ id: 'one', key: 'one' })] }, { id: 's2', title: 'Second', order: 1, components: [] }, { id: 's3', title: 'Third', order: 2, components: [] }] });
const structureNext = makeTemplate({ dynamicSections: [{ id: 'n3', title: 'Third', order: 0, components: [] }, { id: 'n2', title: 'Second', order: 1, components: [] }, { id: 'n4', title: 'Fourth', order: 2, components: [{ id: 'new-field', key: 'new_key', label: 'New field', type: 'text' }] }] });
const structureDiff = buildTemplateReviewPackage(structureNext, structureBase);
assert.ok(structureDiff.changes.some((change) => change.title === 'Section removed'));
assert.ok(structureDiff.changes.some((change) => change.title === 'Section added'));
assert.ok(structureDiff.changes.some((change) => change.title === 'Section moved'));
assert.ok(structureDiff.changes.some((change) => change.title === 'New field added'));
assert.ok(structureDiff.changes.some((change) => change.title === 'Owner removed'));

const componentOrderBase = makeTemplate({ status: 'Approved', supersedesTemplateId: undefined, dynamicSections: [{ id: 's', title: 'Fields', order: 0, components: [field({ id: 'first', key: 'first' }), field({ id: 'second', key: 'second' }), field({ id: 'third', key: 'third' })] }] });
const componentOrderNext = makeTemplate({ dynamicSections: [{ id: 's2', title: 'Fields', order: 0, components: [field({ id: 'third', key: 'third' }), field({ id: 'first', key: 'first' }), field({ id: 'second', key: 'second' })] }] });
assert.ok(buildTemplateReviewPackage(componentOrderNext, componentOrderBase).changes.some((change) => change.kind === 'reordered'));

const typeBase = makeTemplate({ status: 'Approved', supersedesTemplateId: undefined, dynamicSections: [{ id: 's', title: 'Fields', order: 0, components: [field({ type: 'text' })] }] });
const typeNext = makeTemplate({ dynamicSections: [{ id: 's2', title: 'Fields', order: 0, components: [field({ type: 'textarea' })] }] });
assert.ok(buildTemplateReviewPackage(typeNext, typeBase).changes.some((change) => change.title === 'Component type changed'));

const optionBase = makeTemplate({ supersedesTemplateId: undefined, status: 'Approved', dynamicSections: [{ id: 's', title: 'Choices', order: 0, components: [{ id: 'choice', key: 'state', label: 'State', type: 'select', options: [{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'archived', label: 'Archived' }] }] }] });
const optionNext = makeTemplate({ dynamicSections: [{ id: 's2', title: 'Choices', order: 0, components: [{ id: 'choice', key: 'state', label: 'State', type: 'select', options: [{ value: 'closed', label: 'Done' }, { value: 'open', label: 'Open' }, { value: 'hold', label: 'On hold' }] }] }] });
const optionDiff = buildTemplateReviewPackage(optionNext, optionBase);
assert.ok(optionDiff.changes.some((change) => change.title === 'Choice option removed'));
assert.ok(optionDiff.changes.some((change) => change.title === 'Choice option added'));
assert.ok(optionDiff.changes.some((change) => change.title === 'Choice option renamed'));
assert.ok(optionDiff.changes.some((change) => change.title === 'Choice options reordered'));

const tableBase = makeTemplate({ status: 'Approved', supersedesTemplateId: undefined, dynamicSections: [{ id: 's', title: 'Rows', order: 0, components: [{ id: 'table', key: 'items', label: 'Items', type: 'table', tableConfig: { columns: [{ id: 'col-1', key: 'sku', label: 'SKU', type: 'text' }, { id: 'col-2', key: 'qty', label: 'Quantity', type: 'number' }] } }] }] });
const tableNext = makeTemplate({ dynamicSections: [{ id: 's2', title: 'Rows', order: 0, components: [{ id: 'table', key: 'items', label: 'Items', type: 'table', tableConfig: { density: 'compact', columns: [{ id: 'col-2', key: 'quantity', label: 'Units', type: 'number', required: true }, { id: 'col-3', key: 'note', label: 'Note', type: 'text' }] } }] }] });
const tableDiff = buildTemplateReviewPackage(tableNext, tableBase);
assert.ok(tableDiff.changes.some((change) => change.title === 'Table column key changed · Units'));
assert.ok(tableDiff.changes.some((change) => change.title === 'Table column added'));
assert.ok(tableDiff.changes.some((change) => change.title === 'Table column configuration changed · Units'));
assert.ok(tableDiff.changes.some((change) => change.title === 'Table settings changed'), 'non-column table settings are reviewed separately');

const signatureBase = makeTemplate({ status: 'Approved', supersedesTemplateId: undefined, dynamicSections: [{ id: 's', title: 'Signatures', order: 0, components: [{ id: 'sig', key: 'signoff', label: 'Sign off', type: 'signature', signatureConfig: { signatureRole: 'sender', requiredRole: 'manager', assignmentPolicy: 'fixed' } }] }] });
const signatureNext = makeTemplate({ dynamicSections: [{ id: 's2', title: 'Signatures', order: 0, components: [{ id: 'sig', key: 'signoff', label: 'Sign off', type: 'signature', signatureConfig: { signatureRole: 'receiver', requiredRole: 'director', assignmentPolicy: 'report_creator_required' } }] }] });
const signatureDiff = buildTemplateReviewPackage(signatureNext, signatureBase);
assert.ok(signatureDiff.changes.some((change) => change.category === 'Signatures' && change.title === 'Signer context changed'));
assert.ok(signatureDiff.changes.some((change) => change.title === 'Required role changed'));
assert.ok(signatureDiff.changes.some((change) => change.title === 'Assignment policy changed'));

const headingBase = makeTemplate({ status: 'Approved', supersedesTemplateId: undefined, dynamicSections: [{ id: 's', title: 'Content', order: 0, components: [{ id: 'heading', key: 'heading', label: 'Welcome', type: 'heading', headingConfig: { subtitle: 'Before' } }] }] });
const headingNext = makeTemplate({ dynamicSections: [{ id: 's2', title: 'Content', order: 0, components: [{ id: 'heading', key: 'heading', label: 'Welcome', type: 'heading', headingConfig: { subtitle: 'After' } }] }] });
assert.ok(buildTemplateReviewPackage(headingNext, headingBase).changes.some((change) => change.title === 'Content changed'));

const noisyBase = makeTemplate({ status: 'Approved', supersedesTemplateId: undefined, updatedAt: '2025-01-01', dynamicSections: [{ id: 's', title: 'Content', order: 0, components: [field({ sourceMetadata: { source: 'pdf', coordinates: [1, 2] }, sampleValue: 'old', testValues: { owner_name: 'old' } })] }] });
const noisyNext = makeTemplate({ updatedAt: '2026-02-01', dynamicSections: [{ id: 'different-db-id', title: 'Content', order: 0, components: [field({ sourceMetadata: { source: 'docx', coordinates: [9, 9] }, sampleValue: 'new', testValues: { owner_name: 'new' } })] }] });
assert.deepEqual(buildTemplateReviewPackage(noisyNext, noisyBase).changes, [], 'timestamps, import provenance, samples, and test values are omitted');

const newPackage = buildTemplateReviewPackage(makeTemplate({ supersedesTemplateId: undefined }), null);
assert.equal(newPackage.mode, 'new_template');
assert.ok(newPackage.overview);
const missingRevisionBaseline = buildTemplateReviewPackage(makeTemplate(), null);
assert.equal(missingRevisionBaseline.mode, 'revision', 'unavailable revision baseline is not misrepresented as a new template');
assert.equal(missingRevisionBaseline.overview, undefined);
assert.equal(missingRevisionBaseline.warnings.length, 1);

const serialized = deserializeTemplateRow({ id: 'current', supersedes_template_id: 'source', name: 'T', category_id: 'cat', status: 'draft', created_by_user_id: 'u', created_at: 'now' });
assert.equal(serialized.supersedesTemplateId, 'source');
const serializedStableIdentity = deserializeTemplateRow({ id: 'current', supersedes_template_id: 'source', name: 'T', category_id: 'cat', status: 'draft', created_by_user_id: 'u', created_at: 'now' }, [{ id: 'new-section-row', template_id: 'current', name: 'General', display_order: 0 }], [{ id: 'new-field-row', template_id: 'current', section_id: 'new-section-row', field_key: 'owner_name', field_type: 'text', label: 'Owner', configuration: { id: 'stable-component-id', key: 'owner_name' }, display_order: 0 }]);
assert.equal(serializedStableIdentity.dynamicSections?.[0].components[0].id, 'stable-component-id', 'stable component identity stored in field configuration survives regenerated field rows');
assert.equal(serializedStableIdentity.dynamicSections?.[0].components[0].key, 'owner_name');

const ambiguousBase = makeTemplate({ status: 'Approved', supersedesTemplateId: undefined, dynamicSections: [{ id: 'old-1', title: 'Old Section A', order: 0, components: [field({ id: 'duplicate-stable-id', key: 'field_a' })] }, { id: 'old-2', title: 'Old Section B', order: 1, components: [field({ id: 'duplicate-stable-id', key: 'field_b' })] }] });
const ambiguousCurrent = makeTemplate({ dynamicSections: [{ id: 'new-1', title: 'Renamed Section', order: 0, components: [field({ id: 'duplicate-stable-id', key: 'field_a' }), field({ id: 'duplicate-stable-id', key: 'field_b' })] }] });
const ambiguousDiff = buildTemplateReviewPackage(ambiguousCurrent, ambiguousBase);
assert.equal(ambiguousDiff.changes.some((change) => change.kind === 'renamed'), false, 'ambiguous identity is not presented as a confident section rename');
assert.ok(ambiguousDiff.changes.some((change) => change.title === 'Section removed'));
assert.ok(ambiguousDiff.changes.some((change) => change.title === 'Section added'));

const builder = readFileSync(new URL('../../src/components/template-builder/TemplateBuilder.tsx', import.meta.url), 'utf8');
const submitModal = readFileSync(new URL('../../src/components/template-builder/TemplateSubmissionReviewModal.tsx', import.meta.url), 'utf8');
const approvalDrawer = readFileSync(new URL('../../src/components/approvals/ApprovalDetailDrawer.tsx', import.meta.url), 'utf8');
const repository = readFileSync(new URL('../../src/features/templates/repositories/templateRepository.ts', import.meta.url), 'utf8');
const migration023 = readFileSync(new URL('../../supabase/migrations/023_template_domain_operations.sql', import.meta.url), 'utf8');
const migration025 = readFileSync(new URL('../../supabase/migrations/025_template_browser_read_grants.sql', import.meta.url), 'utf8');
const migration037 = readFileSync(new URL('../../supabase/migrations/037_report_historical_template_version_read.sql', import.meta.url), 'utf8');
const migration078 = readFileSync(new URL('../../supabase/migrations/078_template_return_and_report_return_schema_fix.sql', import.meta.url), 'utf8');
const migration085 = readFileSync(new URL('../../supabase/migrations/085_template_workflow_notifications.sql', import.meta.url), 'utf8');
const migration081 = readFileSync(new URL('../../supabase/migrations/081_template_display_id.sql', import.meta.url), 'utf8');
const reviewHook = readFileSync(new URL('../../src/features/templates/review/useTemplateReviewPackage.ts', import.meta.url), 'utf8');
const reviewModel = readFileSync(new URL('../../src/features/templates/review/templateReviewPackage.ts', import.meta.url), 'utf8');
assert.match(builder, /openSubmissionReview/);
assert.match(builder, /TemplateSubmissionReviewModal/);
assert.match(builder, /readinessResult\.errors\.length > 0/);
assert.doesNotMatch(builder, /readinessResult\.warnings\.length > 0[\s\S]{0,100}setShowSubmissionReview\(false\)/);
assert.match(submitModal, /onClose/);
assert.match(submitModal, /Confirm Submit/);
assert.match(submitModal, /loading/);
assert.doesNotMatch(submitModal, /templateService|submit_template_for_approval/);
assert.match(repository, /rpc\('submit_template_for_approval',\s*\{\s*p_template_id:\s*id\s*\}\)/);
assert.match(repository, /getTemplateById\(id: string\)[\s\S]*?from\('templates'\)\.select\('\*'\)\.eq\('id', id\)/);
assert.doesNotMatch(repository, /getTemplateById\([\s\S]{0,400}from\('template_versions'\)/);
assert.match(reviewHook, /getTemplateReviewBaselineId\(current\)/);
assert.match(reviewHook, /templateService\.getTemplateById\(baselineId\)/);
assert.doesNotMatch(reviewHook, /created_at|createdAt|\.sort\(|\.at\(-1\)/);
assert.match(reviewModel, /baselineLabel: `Approved version \$\{baseline\.version \|\| 'current'\}`/);
assert.doesNotMatch(migration023, /submission_note|change_summary/);
assert.match(migration023, /insert into public\.template_versions\([^]*?t\.id,t\.version_label,private\.template_snapshot\(t\.id\)/);
assert.match(migration081, /t\.id,\s*t\.version_label,\s*private\.template_snapshot\(t\.id\)/);
assert.match(migration085, /t\.id, t\.version_label, private\.template_snapshot\(t\.id\)/);
assert.match(migration023, /create trigger templates_immutable_guard before update on public\.templates/);
assert.match(migration023, /old\.status in \('approved','superseded','archived'\)[\s\S]*TEMPLATE_IMMUTABLE/);
assert.match(migration023, /create trigger template_versions_immutable_guard before update or delete on public\.template_versions/);
assert.match(migration025, /revoke insert, update, delete,[\s\S]*?on table\s+public\.templates,[\s\S]*?public\.template_sections,[\s\S]*?public\.template_fields[\s\S]*?from authenticated/);
assert.match(migration023, /configuration,display_order\)[\s\S]*?coalesce\(f->'options','\[\]'\),f,/);
assert.match(migration078, /validation_rules, options, configuration, display_order[\s\S]*?coalesce\(f->'options', '\[\]'\), f,/);
assert.match(migration037, /template_versions_read_via_visible_report/);
assert.match(migration037, /private\.current_user_can_read_report\(r\.id\)/);
assert.match(approvalDrawer, /Approve & Publish/);
assert.match(approvalDrawer, />Reject</);
assert.match(approvalDrawer, /canReviewTemplate/);
assert.match(approvalDrawer, /TemplateReviewPackagePanel/);

console.log('Phase 3D review package checks passed: explicit lineage baseline, new-template summary, deterministic revision diff, transient noise filtering, submit confirmation, and existing reviewer actions.');
