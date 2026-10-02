import type { TemplateComponent, TemplateSection, WidgetTemplate } from '../types/index.js';
import { getBuilderValidationIssues } from './builderValidation.js';
import { isSignatureConfigurationComplete, normalizeSignatureRoleKey, resolveEffectiveReportSignatureFields } from '../shared/signatureResolver.js';

export type ReadinessSeverity = 'error' | 'warning' | 'passed';
export type ReadinessState = 'ready' | 'needs_attention' | 'blocked';

export interface TemplateReadinessIssue {
  id: string;
  severity: ReadinessSeverity;
  category: 'template' | 'sections' | 'fields' | 'tables' | 'signatures' | 'assets' | 'import';
  message: string;
  code: string;
  sectionId?: string;
  componentId?: string;
}

export interface TemplateReadinessResult {
  state: ReadinessState;
  errors: TemplateReadinessIssue[];
  warnings: TemplateReadinessIssue[];
  passedChecks: string[];
}

const PRESENTATION_TYPES = new Set(['heading', 'paragraph', 'divider', 'spacer', 'image', 'info_box', 'kpi']);
const KNOWN_TYPES = new Set(['text', 'textarea', 'number', 'currency', 'percentage', 'date', 'datetime', 'select', 'radio', 'checkbox', 'file', 'rating', 'acknowledgement', 'heading', 'paragraph', 'divider', 'spacer', 'image', 'info_box', 'table', 'repeating_group', 'signature', 'kpi']);

function issue(severity: ReadinessSeverity, category: TemplateReadinessIssue['category'], code: string, message: string, target?: { sectionId?: string; componentId?: string }): TemplateReadinessIssue {
  return { id: `${code}:${target?.componentId || target?.sectionId || 'template'}`, severity, category, code, message, ...target };
}

export function getTemplateReadinessResult(
  template: WidgetTemplate,
  options: { categoryIsActive?: boolean; activeRoleKeys?: Iterable<string> } = {},
): TemplateReadinessResult {
  const issues: TemplateReadinessIssue[] = [];
  const sections = template.dynamicSections || [];
  const allComponents = sections.flatMap((section) => section.components || []);
  const canonicalIssues = getBuilderValidationIssues(template);

  canonicalIssues.forEach((existing) => {
    const category: TemplateReadinessIssue['category'] = existing.area === 'workflow' ? 'template' : existing.componentId ? (existing.code.startsWith('TABLE_') ? 'tables' : 'fields') : 'template';
    const codeMap: Record<string, string> = { NAME_REQUIRED: 'TEMPLATE_NAME_REQUIRED', SECTIONS_REQUIRED: 'SECTIONS_REQUIRED', INPUT_REQUIRED: 'MEANINGFUL_COMPONENT_REQUIRED', MISSING_KEY: 'FIELD_KEY_REQUIRED', DUPLICATE_KEY: 'DUPLICATE_FIELD_KEY', NO_OPTIONS: 'CHOICE_OPTIONS_REQUIRED', MISSING_SIGNATURE_ROLE: 'SIGNATURE_CONFIGURATION_REQUIRED' };
    issues.push(issue('error', category, codeMap[existing.code] || existing.code, existing.message, { componentId: existing.componentId }));
  });

  if (!template.categoryId || options.categoryIsActive === false) issues.push(issue('error', 'template', 'TEMPLATE_CATEGORY_REQUIRED', 'Select an active category before submitting.'));
  if (sections.length === 0) issues.push(issue('error', 'sections', 'SECTIONS_REQUIRED', 'Add at least one section before submitting.'));

  const keys = new Map<string, TemplateComponent[]>();
  sections.forEach((section: TemplateSection) => {
    if (!section.title?.trim()) issues.push(issue('warning', 'sections', 'SECTION_TITLE_REQUIRED', 'Give this section a meaningful title.', { sectionId: section.id }));
    if (!section.components?.length) issues.push(issue('warning', 'sections', 'EMPTY_SECTION', `Section “${section.title || 'Untitled'}” is empty.`, { sectionId: section.id }));
    section.components.forEach((component) => {
      if (!KNOWN_TYPES.has(String(component.type))) issues.push(issue('error', 'fields', 'UNSUPPORTED_COMPONENT', `Component “${component.label || component.key || component.id}” uses an unsupported type.`, { sectionId: section.id, componentId: component.id }));
      if (!PRESENTATION_TYPES.has(component.type) && !component.label?.trim()) issues.push(issue('error', 'fields', 'FIELD_LABEL_REQUIRED', `Add a label to this ${component.type} field.`, { sectionId: section.id, componentId: component.id }));
      const key = component.key?.trim().toLowerCase();
      if (key) keys.set(key, [...(keys.get(key) || []), component]);
      if (component.type === 'select' || component.type === 'radio') {
        const optionsList = (component.options || []).map((option: any) => typeof option === 'string' ? option.trim() : String(option?.label || option?.value || '').trim()).filter(Boolean);
        if (optionsList.length === 0) issues.push(issue('error', 'fields', 'CHOICE_OPTIONS_REQUIRED', `Choice field “${component.label || component.key || component.id}” needs at least one option.`, { sectionId: section.id, componentId: component.id }));
        if (new Set(optionsList.map((option) => option.toLowerCase())).size !== optionsList.length) issues.push(issue('error', 'fields', 'DUPLICATE_CHOICE_OPTION', `Choice field “${component.label || component.key || component.id}” contains duplicate options.`, { sectionId: section.id, componentId: component.id }));
      }
      if (component.required && (component.type === 'select' || component.type === 'radio') && !(component.options || []).length) issues.push(issue('error', 'fields', 'REQUIRED_FIELD_UNUSABLE', `Required field “${component.label || component.key || component.id}” has no usable choices.`, { sectionId: section.id, componentId: component.id }));
      if (component.type === 'table' && (!component.columns || component.columns.length === 0)) issues.push(issue('error', 'tables', 'TABLE_COLUMNS_REQUIRED', `Table “${component.label || component.key || component.id}” needs at least one column.`, { sectionId: section.id, componentId: component.id }));
      if (component.type === 'image' && !(component.assetId || component.assetUrl || component.imageConfig?.assetId || component.imageConfig?.assetUrl)) issues.push(issue('error', 'assets', 'IMAGE_ASSET_REQUIRED', `Image “${component.label || component.key || component.id}” needs an asset reference.`, { sectionId: section.id, componentId: component.id }));
      if ((component.type === 'heading' || component.type === 'paragraph') && !component.label?.trim() && !component.paragraphConfig?.contentHtml?.replace(/<[^>]+>/g, '').trim()) issues.push(issue('warning', 'fields', 'TEXT_CONTENT_EMPTY', `${component.type === 'heading' ? 'Heading' : 'Paragraph'} content is empty.`, { sectionId: section.id, componentId: component.id }));
      const raw = component as any;
      if (['sampleValue', 'sampleRows', 'sourceImageDataUrl', 'sourceImage', 'source', 'sourceId', 'boundingBox', 'normalized'].some((keyName) => raw[keyName] !== undefined)) issues.push(issue('error', 'import', 'TEMP_IMPORT_METADATA_PRESENT', `Component “${component.label || component.key || component.id}” contains temporary import metadata that must not persist.`, { sectionId: section.id, componentId: component.id }));
    });
  });

  keys.forEach((components, key) => {
    if (components.length > 1) components.forEach((component) => issues.push(issue('error', 'fields', 'DUPLICATE_FIELD_KEY', `Field “${component.label || component.id}” uses the same key “${key}” as another field.`, { componentId: component.id })));
  });

  const activeRoleKeys = new Set(Array.from(options.activeRoleKeys || [], normalizeSignatureRoleKey));
  const signatureFields = resolveEffectiveReportSignatureFields(template);
  signatureFields.forEach((field) => {
    const component = allComponents.find((candidate) => candidate.key === field.fieldKey);
    const rawConfig = component?.signatureConfig;
    const configuration = rawConfig ? { configured: Boolean(rawConfig.requiredRole || rawConfig.assignmentPolicy || rawConfig.signatureRole), requiredRoleKey: rawConfig.requiredRole || '', displayLabel: rawConfig.label || component?.label, signatureRole: rawConfig.signatureRole?.toLowerCase() as 'sender' | 'receiver' | undefined } : undefined;
    const rolesForCheck = activeRoleKeys.size ? activeRoleKeys : new Set([normalizeSignatureRoleKey(field.defaultRequiredRoleKey)]);
    if (!isSignatureConfigurationComplete(field, configuration, rolesForCheck)) issues.push(issue('error', 'signatures', 'SIGNATURE_CONFIGURATION_REQUIRED', `Signature “${field.label || field.fieldKey}” needs a complete signer configuration.`, { componentId: component?.id }));
  });

  const errors = issues.filter((item) => item.severity === 'error');
  const warnings = issues.filter((item) => item.severity === 'warning');
  const passedChecks = [
    template.name?.trim() ? 'Template name configured' : '',
    sections.length > 0 ? 'Sections present' : '',
    allComponents.length > 0 ? 'Components inspected' : '',
  ].filter(Boolean);
  return { state: errors.length ? 'blocked' : warnings.length ? 'needs_attention' : 'ready', errors, warnings, passedChecks };
}
