import type { TemplateComponent, TemplateSection, WidgetTemplate } from '../../../types';
import { getReportBusinessFieldKey } from '../../../shared/signatureResolver';

export type TemplateReviewCategory = 'Structure' | 'Fields' | 'Content' | 'Tables' | 'Signatures' | 'Theme' | 'Metadata';
export type TemplateReviewChangeKind = 'added' | 'removed' | 'changed' | 'moved' | 'reordered' | 'renamed';

export interface TemplateReviewChange {
  category: TemplateReviewCategory;
  kind: TemplateReviewChangeKind;
  title: string;
  context?: string;
  before?: string;
  after?: string;
  sectionId?: string;
  componentId?: string;
}

export interface TemplateReviewPackage {
  mode: 'new_template' | 'revision';
  summary: Array<{ label: string; count: number }>;
  changes: TemplateReviewChange[];
  overview?: {
    name: string;
    description: string;
    sectionCount: number;
    inputFieldCount: number;
    contentCount: number;
    tableCount: number;
    signatureCount: number;
    imageCount: number;
    category: string;
    version: string;
    sections: Array<{ title: string; components: Array<{ label: string; type: string }> }>;
  };
  baselineLabel?: string;
  currentLabel: string;
  warnings: string[];
}

export function getTemplateReviewBaselineId(template: WidgetTemplate): string | null {
  return typeof template.supersedesTemplateId === 'string' && template.supersedesTemplateId.trim()
    ? template.supersedesTemplateId.trim()
    : null;
}

export function isCanonicalApprovedBaseline(template: WidgetTemplate): boolean {
  return template.status === 'Approved' || template.status === 'Superseded';
}

interface LocatedComponent {
  component: TemplateComponent;
  section: TemplateSection;
  sectionIndex: number;
  componentIndex: number;
}

const CONTENT_TYPES = new Set(['heading', 'paragraph', 'divider', 'spacer', 'image', 'info_box']);
const INPUT_TYPES = new Set(['text', 'textarea', 'number', 'currency', 'percentage', 'date', 'datetime', 'select', 'radio', 'checkbox', 'table', 'signature', 'file', 'rating', 'acknowledgement', 'repeating_group', 'kpi']);
const TRANSIENT_KEYS = new Set(['source', 'sourceMetadata', 'sampleValue', 'sampleRows', 'sampleImage', 'sourceImage', 'sourceImageDataUrl', 'pdfPage', 'pdfCoordinates', 'selected', 'isSelected', 'runtime', 'testValues', 'testRunValues', 'updatedAt', 'createdAt']);

function getSections(template: WidgetTemplate): TemplateSection[] {
  if (Array.isArray(template.dynamicSections) && template.dynamicSections.length) {
    return template.dynamicSections.map((section, index) => ({ ...section, order: Number(section.order ?? index), components: [...(section.components || [])] }));
  }
  const titles = template.sections?.length ? template.sections : ['General Information'];
  const sections = titles.map((title, order) => ({ id: `name:${title}`, title, order, components: [] as TemplateComponent[] }));
  const componentList = (template.components || template.fields || []) as TemplateComponent[];
  componentList.forEach((component) => {
    const title = component.section || titles[0] || 'General Information';
    let section = sections.find((candidate) => candidate.title === title);
    if (!section) {
      section = { id: `name:${title}`, title, order: sections.length, components: [] };
      sections.push(section);
    }
    section.components.push(component);
  });
  return sections;
}

function locateComponents(sections: TemplateSection[]): LocatedComponent[] {
  return sections.flatMap((section, sectionIndex) => (section.components || []).map((component, componentIndex) => ({ component, section, sectionIndex, componentIndex })));
}

function identity(component: TemplateComponent): string {
  const stableId = typeof component.id === 'string' ? component.id.trim() : '';
  if (stableId) return `id:${stableId}`;
  const key = getReportBusinessFieldKey(component);
  return key ? `key:${key}` : '';
}

function uniqueMap<T>(items: T[], keyOf: (item: T) => string): Map<string, T> {
  const counts = new Map<string, number>();
  items.forEach((item) => { const key = keyOf(item); if (key) counts.set(key, (counts.get(key) || 0) + 1); });
  return new Map(items.flatMap((item) => {
    const key = keyOf(item);
    return key && counts.get(key) === 1 ? [[key, item] as const] : [];
  }));
}

function canonical(value: unknown): string {
  const normalize = (candidate: any): any => {
    if (Array.isArray(candidate)) return candidate.map(normalize);
    if (!candidate || typeof candidate !== 'object') return candidate === undefined ? null : candidate;
    return Object.fromEntries(Object.keys(candidate).sort().filter((key) => !TRANSIENT_KEYS.has(key)).map((key) => [key, normalize(candidate[key])]));
  };
  return JSON.stringify(normalize(value));
}

function safeText(value: unknown, limit = 180): string {
  if (value === null || value === undefined || value === '') return '—';
  const text = String(value)
    .replace(/<\/?(?:script|style)[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text || '—';
}

function lcs(left: string[], right: string[]): Set<string> {
  const rows = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      rows[i][j] = left[i] === right[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]);
    }
  }
  const kept = new Set<string>();
  let i = 0; let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) { kept.add(left[i]); i++; j++; }
    else if (rows[i + 1][j] >= rows[i][j + 1]) i++;
    else j++;
  }
  return kept;
}

function optionLabel(option: any): string {
  return typeof option === 'string' ? option : String(option?.label ?? option?.value ?? 'Option');
}

function optionValue(option: any): string {
  return typeof option === 'string' ? option : String(option?.value ?? option?.label ?? '');
}

function tableColumns(component: TemplateComponent): any[] {
  const columns = component.columns ?? component.tableConfig?.columns ?? [];
  return columns.map((column: any) => ({ id: String(column.id ?? ''), key: String(column.key ?? ''), label: String(column.label ?? column.key ?? 'Column'), type: String(column.type ?? 'text'), required: Boolean(column.required), min: column.min ?? null, max: column.max ?? null, minLength: column.minLength ?? null, maxLength: column.maxLength ?? null, options: column.options ?? [] }));
}

function tableConfigWithoutColumns(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const { columns: _columns, ...config } = value as Record<string, unknown>;
  return config;
}

function titleFor(component: TemplateComponent): string {
  return safeText(component.label || getReportBusinessFieldKey(component) || component.type);
}

function componentSummary(component: TemplateComponent): string {
  const pieces = [humanize(component.type)];
  const key = getReportBusinessFieldKey(component);
  if (key) pieces.push(`Key: ${safeText(key, 80)}`);
  if (component.required) pieces.push('Required');
  if (component.type === 'select' || component.type === 'radio') {
    const choices = (component.options || []).map(optionLabel).filter(Boolean);
    if (choices.length) pieces.push(`Choices: ${choices.slice(0, 5).map((choice) => safeText(choice, 40)).join(', ')}${choices.length > 5 ? ', …' : ''}`);
  }
  if (component.type === 'table') {
    const columns = tableColumns(component).map((column) => safeText(column.label, 50));
    pieces.push(`Columns: ${columns.length ? columns.slice(0, 5).join(', ') + (columns.length > 5 ? ', …' : '') : 'None'}`);
  }
  if (component.type === 'signature') {
    const config = component.signatureConfig || {};
    pieces.push(`Signer: ${safeText(config.signatureRole || 'Not set')}`);
    if (config.requiredRole) pieces.push(`Required role: ${safeText(config.requiredRole)}`);
    pieces.push(`Policy: ${humanize(config.assignmentPolicy || 'fixed')}`);
  }
  if (component.type === 'heading') pieces.push(`Text: ${safeText(component.headingConfig?.subtitle || component.description)}`);
  if (component.type === 'paragraph') pieces.push(`Text: ${safeText(component.paragraphConfig?.contentHtml || component.description)}`);
  return pieces.join(' · ');
}

export function buildTemplateReviewPackage(
  current: WidgetTemplate,
  baseline: WidgetTemplate | null,
  categoryNames: Record<string, string> = {},
): TemplateReviewPackage {
  const currentSections = getSections(current);
  const currentComponents = locateComponents(currentSections);
  const currentLabel = `${current.status === 'Pending Approval' ? 'Pending revision' : current.status} · ${current.version ? `version ${current.version}` : 'version not assigned'}`;
  const warnings: string[] = [];

  if (!baseline) {
    const isRevision = Boolean(getTemplateReviewBaselineId(current));
    if (isRevision) warnings.push('Previous approved version could not be loaded.');
    const contentCount = currentComponents.filter(({ component }) => CONTENT_TYPES.has(component.type)).length;
    const inputFieldCount = currentComponents.filter(({ component }) => INPUT_TYPES.has(component.type) && component.type !== 'table' && component.type !== 'signature').length;
    return {
      mode: isRevision ? 'revision' : 'new_template',
      summary: [{ label: 'sections', count: currentSections.length }, { label: 'input fields', count: inputFieldCount }, { label: 'content components', count: contentCount }, { label: 'tables', count: currentComponents.filter(({ component }) => component.type === 'table').length }, { label: 'signatures', count: currentComponents.filter(({ component }) => component.type === 'signature').length }, { label: 'images/assets', count: currentComponents.filter(({ component }) => component.type === 'image').length }],
      changes: [],
      overview: isRevision ? undefined : {
        name: safeText(current.name),
        description: safeText(current.description, 260),
        sectionCount: currentSections.length,
        inputFieldCount,
        contentCount,
        tableCount: currentComponents.filter(({ component }) => component.type === 'table').length,
        signatureCount: currentComponents.filter(({ component }) => component.type === 'signature').length,
        imageCount: currentComponents.filter(({ component }) => component.type === 'image').length,
        category: categoryNames[current.categoryId] || (current.categoryId ? 'Selected category' : 'No category selected'),
        version: String(current.version || current.status),
        sections: currentSections.map((section) => ({ title: safeText(section.title), components: section.components.map((component) => ({ label: titleFor(component), type: component.type })) })),
      },
      baselineLabel: isRevision ? 'Previous approved version unavailable' : undefined,
      currentLabel,
      warnings,
    };
  }

  const baselineSections = getSections(baseline);
  const baselineComponents = locateComponents(baselineSections);
  const changes: TemplateReviewChange[] = [];
  const add = (change: TemplateReviewChange) => changes.push(change);

  // Match section titles first; renamed sections can only be paired by a unique
  // overlap of stable field identities. Section database IDs regenerate on revision.
  const oldSectionMap = uniqueMap(baselineSections, (section) => `title:${section.title}`);
  const newSectionMap = uniqueMap(currentSections, (section) => `title:${section.title}`);
  const sectionPairs = new Map<TemplateSection, TemplateSection>();
  const pairedCurrent = new Set<TemplateSection>();
  baselineSections.forEach((oldSection) => {
    const match = oldSectionMap.has(`title:${oldSection.title}`) ? newSectionMap.get(`title:${oldSection.title}`) : undefined;
    if (match) { sectionPairs.set(oldSection, match); pairedCurrent.add(match); }
  });
  const componentIdsBySection = (section: TemplateSection) => new Set(section.components.map(identity).filter(Boolean));
  baselineSections.filter((section) => !sectionPairs.has(section)).forEach((oldSection) => {
    const oldIds = componentIdsBySection(oldSection);
    if (!oldIds.size) return;
    const candidates = currentSections.filter((section) => !pairedCurrent.has(section)).map((section) => ({ section, overlap: [...componentIdsBySection(section)].filter((id) => oldIds.has(id)).length })).filter((candidate) => candidate.overlap > 0);
    if (!candidates.length) return;
    const maximum = Math.max(...candidates.map((candidate) => candidate.overlap));
    const best = candidates.filter((candidate) => candidate.overlap === maximum);
    const oldCompetitors = baselineSections.filter((other) => other !== oldSection && !sectionPairs.has(other)).map((other) => [...componentIdsBySection(best[0].section)].filter((id) => componentIdsBySection(other).has(id)).length);
    if (best.length === 1 && (!oldCompetitors.length || maximum > Math.max(...oldCompetitors))) {
      sectionPairs.set(oldSection, best[0].section);
      pairedCurrent.add(best[0].section);
    }
  });

  const currentSectionByOld = new Map<TemplateSection, TemplateSection>();
  for (const [oldSection, currentSection] of sectionPairs) {
    currentSectionByOld.set(oldSection, currentSection);
    if (oldSection.title !== currentSection.title) add({ category: 'Structure', kind: 'renamed', title: 'Section renamed', before: oldSection.title, after: currentSection.title, sectionId: currentSection.id });
  }
  baselineSections.filter((section) => !sectionPairs.has(section)).forEach((section) => add({ category: 'Structure', kind: 'removed', title: 'Section removed', before: section.title }));
  currentSections.filter((section) => !pairedCurrent.has(section)).forEach((section) => add({ category: 'Structure', kind: 'added', title: 'Section added', after: section.title, sectionId: section.id }));
  const oldMatchedSectionOrder = baselineSections.filter((section) => currentSectionByOld.has(section)).map((section) => `section:${section.title}`);
  const newMatchedSectionOrder = currentSections.filter((section) => pairedCurrent.has(section)).map((section) => {
    const old = [...sectionPairs].find(([, value]) => value === section)?.[0];
    return old ? `section:${old.title}` : '';
  }).filter(Boolean);
  const keptSectionOrder = lcs(oldMatchedSectionOrder, newMatchedSectionOrder);
  newMatchedSectionOrder.filter((id) => !keptSectionOrder.has(id)).forEach((id) => {
    const currentSection = [...sectionPairs].find(([old]) => `section:${old.title}` === id)?.[1];
    if (currentSection) add({ category: 'Structure', kind: 'reordered', title: 'Section moved', after: currentSection.title, sectionId: currentSection.id });
  });

  const newByIdentity = uniqueMap(currentComponents, ({ component }) => identity(component));
  const matches = new Map<LocatedComponent, LocatedComponent>();
  const usedCurrent = new Set<LocatedComponent>();
  baselineComponents.forEach((oldEntry) => {
    const key = identity(oldEntry.component);
    const currentEntry = key ? newByIdentity.get(key) : undefined;
    if (currentEntry) { matches.set(oldEntry, currentEntry); usedCurrent.add(currentEntry); }
  });
  // Business-key matching remains deterministic when stored component ids differ.
  const newByKey = uniqueMap(currentComponents, ({ component }) => getReportBusinessFieldKey(component) || '');
  baselineComponents.filter((entry) => !matches.has(entry)).forEach((oldEntry) => {
    const key = getReportBusinessFieldKey(oldEntry.component) || '';
    const currentEntry = key ? newByKey.get(key) : undefined;
    if (currentEntry && !usedCurrent.has(currentEntry)) { matches.set(oldEntry, currentEntry); usedCurrent.add(currentEntry); }
  });
  // A business-key edit is detectable when the persisted component identity is stable.
  baselineComponents.filter((entry) => !matches.has(entry)).forEach((oldEntry) => {
    const stableId = oldEntry.component.id ? `id:${oldEntry.component.id}` : '';
    const match = stableId ? newByIdentity.get(stableId) : undefined;
    if (match && !usedCurrent.has(match)) { matches.set(oldEntry, match); usedCurrent.add(match); }
  });

  const oldSectionNameByCurrent = new Map<TemplateSection, string>();
  sectionPairs.forEach((currentSection, oldSection) => oldSectionNameByCurrent.set(currentSection, oldSection.title));
  const changeForComponent = (category: TemplateReviewCategory, kind: TemplateReviewChangeKind, title: string, entry: LocatedComponent, before?: string, after?: string): TemplateReviewChange => ({ category, kind, title, context: entry.section.title, before, after, sectionId: entry.section.id, componentId: entry.component.id });

  baselineComponents.filter((entry) => !matches.has(entry)).forEach((entry) => add(changeForComponent(CONTENT_TYPES.has(entry.component.type) ? 'Content' : entry.component.type === 'table' ? 'Tables' : entry.component.type === 'signature' ? 'Signatures' : 'Fields', 'removed', `${titleFor(entry.component)} removed`, entry, componentSummary(entry.component))));
  currentComponents.filter((entry) => !usedCurrent.has(entry)).forEach((entry) => add(changeForComponent(CONTENT_TYPES.has(entry.component.type) ? 'Content' : entry.component.type === 'table' ? 'Tables' : entry.component.type === 'signature' ? 'Signatures' : 'Fields', 'added', `${titleFor(entry.component)} added`, entry, undefined, componentSummary(entry.component))));

  for (const [oldEntry, newEntry] of matches) {
    const oldComponent = oldEntry.component;
    const newComponent = newEntry.component;
    const businessCategory: TemplateReviewCategory = CONTENT_TYPES.has(oldComponent.type) || CONTENT_TYPES.has(newComponent.type) ? 'Content' : oldComponent.type === 'table' || newComponent.type === 'table' ? 'Tables' : oldComponent.type === 'signature' || newComponent.type === 'signature' ? 'Signatures' : 'Fields';
    const context = oldSectionNameByCurrent.get(newEntry.section) || newEntry.section.title;
    const attach = (kind: TemplateReviewChangeKind, title: string, before?: string, after?: string, category = businessCategory) => add({ category, kind, title, context, before, after, sectionId: newEntry.section.id, componentId: newComponent.id });

    const oldKey = getReportBusinessFieldKey(oldComponent) || '';
    const newKey = getReportBusinessFieldKey(newComponent) || '';
    if (oldKey !== newKey) attach('changed', 'Business field key changed', oldKey || '—', newKey || '—', 'Fields');
    if (oldComponent.label !== newComponent.label) attach('changed', CONTENT_TYPES.has(newComponent.type) ? 'Content label changed' : 'Field label changed', safeText(oldComponent.label), safeText(newComponent.label));
    if (oldComponent.type !== newComponent.type) attach('changed', 'Component type changed', oldComponent.type, newComponent.type, 'Fields');
    if (Boolean(oldComponent.required) !== Boolean(newComponent.required)) attach('changed', 'Required status changed', oldComponent.required ? 'Yes' : 'No', newComponent.required ? 'Yes' : 'No', 'Fields');
    const oldWidth = oldComponent.layoutWidth || oldComponent.layout?.width || 'full';
    const newWidth = newComponent.layoutWidth || newComponent.layout?.width || 'full';
    const oldPercent = oldComponent.layout?.widthPercent ?? null;
    const newPercent = newComponent.layout?.widthPercent ?? null;
    if (oldWidth !== newWidth || oldPercent !== newPercent) attach('changed', 'Field width changed', oldPercent ? `${oldWidth} (${oldPercent}%)` : oldWidth, newPercent ? `${newWidth} (${newPercent}%)` : newWidth, 'Fields');
    const oldSection = currentSectionByOld.get(oldEntry.section);
    if (oldSection && oldSection !== newEntry.section) attach('moved', 'Component moved to another section', oldEntry.section.title, newEntry.section.title);
    else if (!oldSection && oldEntry.section.title !== newEntry.section.title) attach('moved', 'Component moved to another section', oldEntry.section.title, newEntry.section.title);

    if (oldComponent.type === 'select' || oldComponent.type === 'radio' || newComponent.type === 'select' || newComponent.type === 'radio') {
      const oldOptions = (oldComponent.options || []).map((option: any) => ({ value: optionValue(option), label: optionLabel(option) }));
      const newOptions = (newComponent.options || []).map((option: any) => ({ value: optionValue(option), label: optionLabel(option) }));
      const oldOptionMap = uniqueMap(oldOptions, (option) => option.value);
      const newOptionMap = uniqueMap(newOptions, (option) => option.value);
      oldOptions.filter((option) => !newOptionMap.has(option.value)).forEach((option) => attach('removed', 'Choice option removed', option.label, undefined, 'Fields'));
      newOptions.filter((option) => !oldOptionMap.has(option.value)).forEach((option) => attach('added', 'Choice option added', undefined, option.label, 'Fields'));
      oldOptions.filter((option) => newOptionMap.has(option.value) && newOptionMap.get(option.value)!.label !== option.label).forEach((option) => attach('changed', 'Choice option renamed', option.label, newOptionMap.get(option.value)!.label, 'Fields'));
      const oldOrder = oldOptions.map((option) => option.value).filter((value) => newOptionMap.has(value));
      const newOrder = newOptions.map((option) => option.value).filter((value) => oldOptionMap.has(value));
      const kept = lcs(oldOrder, newOrder);
      if (oldOrder.length === newOrder.length && oldOrder.some((value) => !kept.has(value))) attach('reordered', 'Choice options reordered', undefined, undefined, 'Fields');
    }

    if (oldComponent.type === 'table' || newComponent.type === 'table') {
      const oldColumns = tableColumns(oldComponent);
      const newColumns = tableColumns(newComponent);
      const oldColumnMap = uniqueMap(oldColumns, (column) => column.key);
      const newColumnMap = uniqueMap(newColumns, (column) => column.key);
      const newColumnIds = uniqueMap(newColumns, (column) => column.id || '');
      const columnMatches = new Map<any, any>();
      const matchedNewColumns = new Set<any>();
      oldColumns.forEach((column) => {
        const next = (column.id && newColumnIds.get(column.id)) || newColumnMap.get(column.key);
        if (next && !matchedNewColumns.has(next)) { columnMatches.set(column, next); matchedNewColumns.add(next); }
      });
      oldColumns.filter((column) => !columnMatches.has(column)).forEach((column) => attach('removed', 'Table column removed', column.label, undefined, 'Tables'));
      newColumns.filter((column) => !matchedNewColumns.has(column)).forEach((column) => attach('added', 'Table column added', undefined, column.label, 'Tables'));
      columnMatches.forEach((next, column) => {
        if (column.key !== next.key) attach('changed', `Table column key changed · ${next.label}`, column.key, next.key, 'Tables');
        if (column.label !== next.label) attach('changed', 'Table column label changed', column.label, next.label, 'Tables');
        if (column.type !== next.type || column.required !== next.required || column.min !== next.min || column.max !== next.max || column.minLength !== next.minLength || column.maxLength !== next.maxLength || canonical(column.options) !== canonical(next.options)) attach('changed', `Table column configuration changed · ${next.label}`, `${column.type}${column.required ? ' · required' : ''}`, `${next.type}${next.required ? ' · required' : ''}`, 'Tables');
      });
      if (oldColumns.length && newColumns.length && oldColumns.map((column) => column.key).join('|') !== newColumns.map((column) => column.key).join('|')) {
        const commonOld = oldColumns.map((column) => column.key).filter((key) => newColumnMap.has(key));
        const commonNew = newColumns.map((column) => column.key).filter((key) => oldColumnMap.has(key));
        const kept = lcs(commonOld, commonNew);
        if (commonOld.length === commonNew.length && commonOld.some((key) => !kept.has(key))) attach('reordered', 'Table columns reordered', undefined, undefined, 'Tables');
      }
    }

    if (oldComponent.type === 'signature' || newComponent.type === 'signature') {
      const oldConfig = oldComponent.signatureConfig || {};
      const newConfig = newComponent.signatureConfig || {};
      const signatureProperties: Array<[keyof typeof oldConfig, string]> = [['signatureRole', 'Signer context'], ['requiredRole', 'Required role'], ['assignmentPolicy', 'Assignment policy'], ['label', 'Signature label']];
      signatureProperties.forEach(([key, label]) => {
        const before = String((oldConfig as any)[key] ?? '—');
        const after = String((newConfig as any)[key] ?? '—');
        if (before !== after) attach('changed', `${label} changed`, before, after, 'Signatures');
      });
    }

    if (oldComponent.type === 'heading' || oldComponent.type === 'paragraph' || newComponent.type === 'heading' || newComponent.type === 'paragraph') {
      const oldContent = oldComponent.type === 'heading' ? oldComponent.headingConfig?.subtitle || oldComponent.description : oldComponent.paragraphConfig?.contentHtml || oldComponent.description;
      const newContent = newComponent.type === 'heading' ? newComponent.headingConfig?.subtitle || newComponent.description : newComponent.paragraphConfig?.contentHtml || newComponent.description;
      if (safeText(oldContent) !== safeText(newContent)) attach('changed', 'Content changed', safeText(oldContent), safeText(newContent), 'Content');
    }

    const stableProperties: Array<[string, string]> = [['placeholder', 'Placeholder'], ['description', 'Description'], ['defaultValue', 'Default value'], ['validation', 'Validation rules'], ['appearance', 'Appearance'], ['headingConfig', 'Heading style'], ['paragraphConfig', 'Paragraph style'], ['imageConfig', 'Image settings'], ['tableConfig', 'Table settings'], ['ratingConfig', 'Rating settings'], ['acknowledgementConfig', 'Acknowledgement settings']];
    stableProperties.forEach(([property, label]) => {
      if (property === 'description' && (oldComponent.type === 'heading' || oldComponent.type === 'paragraph')) return;
      if (property === 'validation' && oldComponent.type === 'table') return;
      const oldValue = property === 'tableConfig' && oldComponent.type === 'table' ? tableConfigWithoutColumns((oldComponent as any)[property]) : (oldComponent as any)[property];
      const newValue = property === 'tableConfig' && newComponent.type === 'table' ? tableConfigWithoutColumns((newComponent as any)[property]) : (newComponent as any)[property];
      if (canonical(oldValue) !== canonical(newValue)) {
        const before = property === 'validation' ? summarizeValidation((oldComponent as any)[property]) : property === 'defaultValue' ? safeText((oldComponent as any)[property]) : 'Previous setting';
        const after = property === 'validation' ? summarizeValidation((newComponent as any)[property]) : property === 'defaultValue' ? safeText((newComponent as any)[property]) : 'Updated setting';
        attach('changed', `${label} changed`, before, after, property === 'appearance' || property.endsWith('Config') ? (oldComponent.type === 'signature' ? 'Signatures' : oldComponent.type === 'table' ? 'Tables' : businessCategory) : businessCategory);
      }
    });
  }

  const oldIdentityByCurrent = new Map<LocatedComponent, string>();
  matches.forEach((currentEntry, oldEntry) => oldIdentityByCurrent.set(currentEntry, identity(oldEntry.component)));
  for (const [oldSection, currentSection] of sectionPairs) {
    const oldSequence = baselineComponents.filter((entry) => entry.section === oldSection && matches.has(entry)).map((entry) => identity(entry.component));
    const newSequence = currentComponents.filter((entry) => entry.section === currentSection && usedCurrent.has(entry)).map((entry) => oldIdentityByCurrent.get(entry) || '').filter(Boolean);
    const kept = lcs(oldSequence, newSequence);
    currentComponents.filter((entry) => entry.section === currentSection && usedCurrent.has(entry) && !kept.has(oldIdentityByCurrent.get(entry) || '')).forEach((entry) => {
      const matchedOld = [...matches].find(([, candidate]) => candidate === entry)?.[0];
      if (matchedOld && currentSectionByOld.get(matchedOld.section) === currentSection) add({ category: 'Structure', kind: 'reordered', title: `${titleFor(entry.component)} reordered`, context: entry.section.title, sectionId: entry.section.id, componentId: entry.component.id });
    });
  }

  if (current.name !== baseline.name) add({ category: 'Metadata', kind: 'changed', title: 'Template name changed', before: safeText(baseline.name), after: safeText(current.name) });
  if (current.description !== baseline.description) add({ category: 'Metadata', kind: 'changed', title: 'Template description changed', before: safeText(baseline.description), after: safeText(current.description) });
  if (current.categoryId !== baseline.categoryId) add({ category: 'Metadata', kind: 'changed', title: 'Category changed', before: categoryNames[baseline.categoryId] || 'Previous category', after: categoryNames[current.categoryId] || 'Current category' });
  if (canonical(current.theme) !== canonical(baseline.theme)) {
    const changedThemeKeys = [...new Set([...Object.keys(current.theme || {}), ...Object.keys(baseline.theme || {})])].filter((key) => canonical((current.theme as any)?.[key]) !== canonical((baseline.theme as any)?.[key]));
    add({ category: 'Theme', kind: 'changed', title: changedThemeKeys.length ? `Theme updated · ${changedThemeKeys.map(humanize).join(', ')}` : 'Theme updated' });
  }

  const summaryMap = new Map<string, number>();
  const count = (label: string, predicate: (change: TemplateReviewChange) => boolean) => {
    const number = changes.filter(predicate).length;
    if (number) summaryMap.set(label, number);
  };
  count('sections changed', (change) => change.category === 'Structure' && change.title.startsWith('Section'));
  count('fields added', (change) => change.category === 'Fields' && change.kind === 'added');
  count('fields removed', (change) => change.category === 'Fields' && change.kind === 'removed');
  count('field configurations updated', (change) => change.category === 'Fields' && change.kind === 'changed');
  count('table changes', (change) => change.category === 'Tables');
  count('signature configurations changed', (change) => change.category === 'Signatures');
  count('content changes', (change) => change.category === 'Content');
  count('theme changes', (change) => change.category === 'Theme');
  count('metadata changes', (change) => change.category === 'Metadata');

  return {
    mode: 'revision',
    summary: [...summaryMap].map(([label, count]) => ({ label, count })),
    changes,
    baselineLabel: `Approved version ${baseline.version || 'current'}`,
    currentLabel,
    warnings,
  };
}

function summarizeValidation(value: any): string {
  if (!value || typeof value !== 'object') return value ? 'Configured' : 'None';
  const items = Object.entries(value).filter(([, setting]) => setting !== undefined && setting !== null && setting !== '').map(([key, setting]) => `${humanize(key)} ${String(setting)}`);
  return items.join(', ') || 'No validation rules';
}

function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}
