import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import type { ImportDetection, ImportIssue, ImportProposal, TemplateComponent, TemplateComponentType, TemplateSection, WidgetTemplate } from '../types';
import { analyzePdfTemplateImport } from './pdfImportBrowser';
import { classifyDocxTableRows } from './docxImportModel';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SECTIONS = 100;
const MAX_COMPONENTS = 1000;
const MAX_ROWS = 5000;
const MAX_COLUMNS = 100;
const MAX_TEXT_LENGTH = 10000;
const SUPPORTED = new Set(['docx', 'xlsx', 'xls', 'json', 'pdf']);
const COMPONENT_TYPES = new Set<TemplateComponentType>(['text','textarea','number','currency','percentage','date','datetime','select','radio','checkbox','file','rating','acknowledgement','heading','paragraph','divider','spacer','image','info_box','table','repeating_group','signature','kpi']);
const idFor = (prefix: string, index: number) => `${prefix}-${index}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : `${Date.now()}_${index}`}`;
const slug = (value: string, fallback: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || fallback;
function uniqueKey(label: string, used: Set<string>, index: number) { const base = slug(label, `field_${index}`); let key = base; let suffix = 2; while (used.has(key)) key = `${base}_${suffix++}`; used.add(key); return key; }
function fieldType(label: string, sampleValue?: string): TemplateComponentType {
  if (/employee\s*(number|id)|user\s*id|serial\s*(number|no)?|batch\s*(number|no)?|lot\s*(number|no)?|reference\s*(number|no)?|document\s*(number|no)?/i.test(label)) return 'text';
  if (/date/i.test(label)) return 'date';
  if (/^(from|to)$/i.test(label.trim())) return 'date';
  if (/amount|cost|price|salary|fee|total|currency/i.test(label)) return 'currency';
  if (/count|quantity|number|qty/i.test(label) && (!sampleValue || /^[-+]?\d+(?:\.\d+)?$/.test(sampleValue.trim()))) return 'number';
  if (/reason|description|comments|notes|justification/i.test(label)) return 'textarea';
  return 'text';
}
function makeSection(title: string, index: number): TemplateSection { return { id: idFor('sec-import', index), title: title || `Section ${index + 1}`, order: index, components: [] }; }
function makeComponent(type: TemplateComponentType, label: string, sectionTitle: string, index: number, keys: Set<string>, extra: Partial<TemplateComponent> = {}): TemplateComponent {
  const width = type === 'textarea' || type === 'table' || type === 'paragraph' ? 'full' : 'half';
  return { id: idFor('comp-import', index), type, key: uniqueKey(label, keys, index), label: label || `Imported field ${index + 1}`, section: sectionTitle, layoutWidth: width, layout: { width }, order: index, ...extra };
}
function safeText(value: unknown, fallback = ''): string {
  return Array.from(String(value ?? fallback)).filter((character) => {
    const code = character.charCodeAt(0);
    return code >= 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
  }).join('').slice(0, MAX_TEXT_LENGTH);
}
function sanitizeHtml(value: unknown): string {
  return safeText(value).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/(?:href|src)\s*=\s*("|')\s*javascript:[^"']*\1/gi, '');
}
function makeProposal(filename: string, sourceType: ImportProposal['sourceType'], sections: TemplateSection[], components: TemplateComponent[], issues: ImportIssue[], sourceMetadata?: ImportProposal['sourceMetadata']): ImportProposal {
  const detections: ImportDetection[] = sections.map((s) => ({ sectionId: s.id, sectionTitle: s.title, components: s.components.map((c) => ({ id: c.id, key: c.key, label: c.label || c.key, type: c.type, confidence: c.type === 'text' || c.type === 'paragraph' || c.type === 'heading' ? 'high' : 'needs_confirmation', confidenceReason: c.type === 'text' || c.type === 'paragraph' || c.type === 'heading' ? 'Detected from an explicit document structure.' : 'Inferred from labels or tabular structure; verify before creating.' })) }));
  return { creationMethod: 'import', sourceFilename: filename, sourceType, summary: { sectionCount: sections.length, fieldCount: components.filter((c) => !['heading','paragraph','divider','spacer'].includes(c.type)).length, tableCount: components.filter((c) => c.type === 'table').length, confidence: issues.some((i) => i.severity === 'warning') ? 'Needs Review' : components.length > 3 ? 'High' : 'Medium' }, issues, detections, sourceMetadata, template: { name: filename.replace(/\.[^/.]+$/, ''), description: `Imported from ${filename}`, version: 'v1.0', status: 'Draft', creationMethod: 'import', sections: sections.map((s) => s.title), dynamicSections: sections, components } as Partial<WidgetTemplate> };
}
function validateJsonTemplate(parsed: unknown): { template: Partial<WidgetTemplate>; issues: ImportIssue[] } {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('WidgetFlow could not validate this JSON template.');
  const value = parsed as Record<string, unknown>;
  const rawSections = Array.isArray(value.dynamicSections) ? value.dynamicSections : Array.isArray(value.sections) ? value.sections.map((title) => ({ title })) : [];
  const rawComponents = Array.isArray(value.components) ? value.components : Array.isArray(value.fields) ? value.fields : rawSections.flatMap((section) => section && typeof section === 'object' && Array.isArray((section as Record<string, unknown>).components) ? (section as Record<string, unknown>).components as unknown[] : []);
  if (typeof value.name !== 'string' || !value.name.trim() || (!rawComponents.length && !rawSections.length)) throw new Error('WidgetFlow could not validate this JSON template.');
  if (rawSections.length > MAX_SECTIONS || rawComponents.length > MAX_COMPONENTS) throw new Error('This template is too large to analyze safely.');
  const issues: ImportIssue[] = []; const ids = new Set<string>(); const keys = new Set<string>();
  const components = rawComponents.map((raw, index) => {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const type = typeof item.type === 'string' && COMPONENT_TYPES.has(item.type as TemplateComponentType) ? item.type as TemplateComponentType : 'text';
    if (type !== item.type) issues.push({ severity: 'warning', message: `Component ${index + 1} uses an unsupported type and was converted to text.` });
    const id = typeof item.id === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(item.id) && !ids.has(item.id) ? item.id : idFor('comp-import', index);
    const key = typeof item.key === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,119}$/.test(item.key) && !keys.has(item.key) ? item.key : uniqueKey(String(item.label || type), keys, index);
    ids.add(id); keys.add(key);
    const safe: TemplateComponent = { id, key, type, label: safeText(item.label, key), description: safeText(item.description), placeholder: safeText(item.placeholder), required: Boolean(item.required), order: index, section: safeText(item.section, 'General Information'), options: Array.isArray(item.options) ? item.options.slice(0, 100).map((option) => typeof option === 'object' ? option : safeText(option)) : undefined, columns: Array.isArray(item.columns) ? item.columns.slice(0, MAX_COLUMNS) as any : undefined, paragraphConfig: item.paragraphConfig && typeof item.paragraphConfig === 'object' ? { ...(item.paragraphConfig as any), contentHtml: sanitizeHtml((item.paragraphConfig as any).contentHtml) } : undefined };
    return safe;
  });
  const sectionIds = new Set<string>();
  const sections = rawSections.length ? rawSections.map((raw, index) => { const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>; const candidateId = typeof item.id === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(item.id) && !sectionIds.has(item.id) ? item.id : idFor('sec-import', index); sectionIds.add(candidateId); return { id: candidateId, title: safeText(item.title, `Section ${index + 1}`), order: index, components: components.filter((c) => c.section === item.title) } as TemplateSection; }) : [{ id: idFor('sec-import', 0), title: 'General Information', order: 0, components }];
  const template: Partial<WidgetTemplate> = { name: safeText(value.name, 'Imported Template'), description: safeText(value.description), categoryId: safeText(value.categoryId), version: typeof value.version === 'string' || typeof value.version === 'number' ? value.version : 'v1.0', tags: Array.isArray(value.tags) ? value.tags.slice(0, 50).map((tag) => safeText(tag)).filter(Boolean) : [], layoutType: value.layoutType as any, status: 'Draft', creationMethod: 'import', sections: sections.map((s) => s.title), dynamicSections: sections, components, fields: components as any, theme: value.theme as any, headerConfig: value.headerConfig as any, footerConfig: value.footerConfig as any, config: value.config as any };
  if (value.workflow || value.rules || value.calculations) issues.push({ severity: 'warning', message: 'Legacy workflow or logic metadata was ignored; imported templates do not activate workflow behavior.' });
  return { issues, template };
}
interface DocxEmbeddedImageEvidence { sourceId: string; order: number; mimeType?: string; dataUrl: string; }
function analyzeDocxHtml(html: string, filename: string, sizeBytes: number, embeddedImages: DocxEmbeddedImageEvidence[] = []): ImportProposal {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const sections = [makeSection('Document Information', 0)];
  const components: TemplateComponent[] = [];
  const issues: ImportIssue[] = [];
  const keys = new Set<string>();
  const ledger: NonNullable<NonNullable<ImportProposal['sourceMetadata']>['docxCoverage']>['ledger'] = [];
  let current = sections[0];
  let tableIndex = 0;
  const addComponent = (component: TemplateComponent) => { components.push(component); current.components.push(component); };
  const cellText = (cell: Element) => safeText((cell.textContent || '').replace(/\s+/g, ' ').trim());
  const isLabel = (value: string) => /:$/.test(value) || /^[A-Za-z][A-Za-z /&()#-]{2,60}$/i.test(value) || /employee|department|directorate|manager|location|building|user id|serial|quantity|item/i.test(value);
  const isSentence = (value: string) => /^(i\s+commit|i['’]m\s+fully|received the following|i am fully|this document|please use)/i.test(value) || value.split(/\s+/).length > 14;
  const addLedger = (entry: typeof ledger[number]) => ledger.push(entry);
  const withAutoDirection = (markup: string) => markup.replace(/<(p|div|li)(?![^>]*\bdir=)(?=[\s>])/gi, '<$1 dir="auto"');
  const makeParagraph = (text: string, node: Element, reason = 'Document content') => {
    const item = makeComponent('paragraph', text.slice(0, MAX_TEXT_LENGTH), current.title, components.length, keys, { paragraphConfig: { contentHtml: withAutoDirection(sanitizeHtml(node.outerHTML)) } });
    addComponent(item);
    issues.push({ severity: 'info', message: `${reason} was preserved as document content.`, fieldKey: item.key });
    return item;
  };
  const imageLedger: NonNullable<NonNullable<ImportProposal['sourceMetadata']>['docxCoverage']>['images'] = [];
  const imageNodes = Array.from(doc.querySelectorAll('img'));
  const contentImageNodes = new Set<Element>();
  const sourceSampleImageNodes = new Set<Element>();
  imageNodes.forEach((imageNode, imageIndex) => {
    const evidence = embeddedImages[imageIndex];
    const dataUrl = evidence?.dataUrl || imageNode.getAttribute('src') || '';
    if (!dataUrl) return;
    const cell = imageNode.closest('td,th');
    const row = cell?.closest('tr');
    const paragraph = imageNode.closest('p,li');
    const container = cell || paragraph || imageNode.parentElement;
    const containerText = safeText((container?.textContent || '').replace(/\s+/g, ' ').trim());
    const adjacentText = [
      imageNode.previousElementSibling?.textContent,
      imageNode.nextElementSibling?.textContent,
      container && !cell ? container.previousElementSibling?.textContent : undefined,
      container && !cell ? container.nextElementSibling?.textContent : undefined,
    ]
      .filter(Boolean)
      .map((value) => safeText(String(value)).replace(/\s+/g, ' ').trim())
      .join(' ');
    const rowText = row && row.querySelectorAll('td,th').length <= 4
      ? safeText((row.textContent || '').replace(/\s+/g, ' ').trim())
      : '';
    const previousText = safeText((container?.previousElementSibling?.textContent || imageNode.previousElementSibling?.textContent || '').replace(/\s+/g, ' ').trim());
    const nextText = safeText((container?.nextElementSibling?.textContent || imageNode.nextElementSibling?.textContent || '').replace(/\s+/g, ' ').trim());
    const tableRow = row ? Array.from(row.parentElement?.children || []).indexOf(row) : undefined;
    const tableCell = cell && row ? Array.from(row.querySelectorAll('td,th')).indexOf(cell) : undefined;
    const evidenceLocation = { semanticNodeIndex: imageIndex, containerType: container?.tagName.toLowerCase(), tableRow: tableRow === -1 ? undefined : tableRow, tableCell: tableCell === -1 ? undefined : tableCell, previousText, nextText };
    const context = [containerText, adjacentText, rowText].filter(Boolean).join(' ').slice(0, MAX_TEXT_LENGTH);
    const signatureContext = /signature|signed\s*by|sign[- ]?off/i.test(containerText)
      || (/eis\s*member/i.test(containerText) && /signature/i.test(rowText));
    const sourceId = evidence?.sourceId || `docx-image-${imageIndex + 1}`;
    if (signatureContext) {
      sourceSampleImageNodes.add(imageNode);
      imageLedger.push({ sourceId, order: imageIndex, mimeType: evidence?.mimeType, status: 'source_sample_image', context, ...evidenceLocation });
      issues.push({ severity: 'warning', message: 'Filled source signature/date image detected. It will not be included in the reusable template.' });
      return;
    }
    if (!context) {
      imageLedger.push({ sourceId, order: imageIndex, mimeType: evidence?.mimeType, status: 'unresolved_image', context, ...evidenceLocation });
      issues.push({ severity: 'warning', message: 'Embedded image needs local context review before it can be retained.' });
      return;
    }
    const item = makeComponent('image', 'Embedded document image', current.title, components.length, keys, { imageConfig: { assetUrl: dataUrl, altText: 'Embedded document image', imageWidth: 'full', alignment: 'center', fitMode: 'contain' } });
    (item as any).sampleImage = true;
    (item as any).sourceImageDataUrl = dataUrl;
    (item as any).sourceImage = { sourceId, order: imageIndex, mimeType: evidence?.mimeType, classification: 'DOCUMENT_CONTENT_IMAGE', context };
    addComponent(item);
    contentImageNodes.add(imageNode);
    imageLedger.push({ sourceId, order: imageIndex, mimeType: evidence?.mimeType, status: 'mapped_image', context, ...evidenceLocation });
    issues.push({ severity: 'warning', message: 'Embedded document image detected. Text inside this image will remain an image and is not editable.', fieldKey: item.key });
  });
  const looksLikeGarbledFallback = (value: string) => {
    if (/[\u0600-\u06ff]/.test(value)) return false;
    const compact = value.replace(/\s+/g, '');
    const punctuationRatio = compact ? Array.from(compact).filter((character) => !/[A-Za-z0-9]/.test(character)).length / compact.length : 0;
    return /[�]|(?:Ã.|Â.|Ð.|Ñ.|â€)/.test(value)
      || (value.length <= 120 && punctuationRatio >= 0.2 && /(?:\.{2,}|[)\]}]{2,}|\d{3,})/.test(value));
  };
  const neighborContainsImage = (element: Element | null, images: Set<Element>) => Boolean(element && Array.from(element.querySelectorAll('img')).some((image) => images.has(image)));
  const isPairedFallbackNode = (node: Element) => {
    const images = new Set([...contentImageNodes, ...sourceSampleImageNodes]);
    if (Array.from(node.querySelectorAll('img')).some((image) => images.has(image))) return true;
    if (neighborContainsImage(node.previousElementSibling, images) || neighborContainsImage(node.nextElementSibling, images)) return true;
    const parent = node.parentElement;
    return Boolean(parent && (neighborContainsImage(node, images) || neighborContainsImage(node.previousElementSibling, images) || neighborContainsImage(node.nextElementSibling, images)));
  };
  const children = Array.from(doc.body.children).slice(0, MAX_COMPONENTS);
  children.forEach((node, index) => {
    const text = safeText((node.textContent || '').replace(/\s+/g, ' ').trim());
    if (!text) return;
    const tag = node.tagName.toLowerCase();
    if (isPairedFallbackNode(node) && ['p', 'div', 'li'].includes(tag) && looksLikeGarbledFallback(text)) {
      issues.push({ severity: 'warning', message: 'Garbled fallback text associated with an embedded image was suppressed; the source image remains available for review.' });
      return;
    }
    if (/^h[1-3]$/.test(tag) || (index === 0 && text.length < 100 && !/:$/.test(text))) {
      if (components.length === 0 && current.components.length === 0) addComponent(makeComponent('heading', text, current.title, index, keys));
      else if (sections.length < MAX_SECTIONS) { current = makeSection(text, sections.length); sections.push(current); }
      return;
    }
    if (tag === 'table') {
      const rows = Array.from(node.querySelectorAll('tr')).slice(0, MAX_ROWS).map((row) => Array.from(row.querySelectorAll('th,td')).slice(0, MAX_COLUMNS).map(cellText));
      const kind = classifyDocxTableRows(rows.map((row) => row.join('\t')));
      const classification = { kind, reason: kind === 'FORM_GRID' ? `Detected alternating label/value columns across ${rows.length} rows.` : kind === 'DATA_TABLE' ? 'Detected a stable header row followed by repeated record rows.' : kind === 'CONTENT_TABLE' ? 'Detected paragraph-like or bilingual content without repeated record structure.' : 'Table structure is ambiguous and needs confirmation.' };
      const thisTable = tableIndex++;
      if (classification.kind === 'FORM_GRID') {
        const fieldLabel = (value: string) => value.replace(/:$/, '').trim();
        const isLayoutLabel = (value: string) => /^(temporary|permanent|allocation\s*type|from|to|eis\s*member|signature|date|signed\s*by)$/i.test(fieldLabel(value)) || /:$/.test(value);
        const isAllocationLabel = (value: string) => /^(temporary|permanent|allocation\s*type)$/i.test(fieldLabel(value));
        let allocationAdded = false;
        rows.forEach((row, rowIndex) => {
          row.forEach((rawCell, column) => {
            const label = fieldLabel(rawCell);
            if (!label || !isLayoutLabel(rawCell)) return;
            if (isAllocationLabel(label)) {
              if (!allocationAdded && (row.some((cell) => /^temporary$/i.test(fieldLabel(cell))) || row.some((cell) => /^permanent$/i.test(fieldLabel(cell))) || /^allocation\s*type$/i.test(label))) {
                const item = makeComponent('select', 'Allocation Type', current.title, components.length, keys, { options: [{ label: 'Temporary', value: 'Temporary' }, { label: 'Permanent', value: 'Permanent' }] });
                addComponent(item);
                allocationAdded = true;
              }
              addLedger({ sourceId: `docx-table-${thisTable}-${rowIndex}-${column}`, tableIndex: thisTable, row: rowIndex, column, text: label, status: 'mapped' });
              return;
            }
            const value = row.slice(column + 1).find((cell) => cell && !isLayoutLabel(cell))?.trim() || '';
            const type = /^signature$/i.test(label) || /signed\s*by/i.test(label)
              ? 'signature'
              : /^(from|to|date)$/i.test(label)
                ? 'date'
                : fieldType(label, value);
            const item = makeComponent(type, label, current.title, components.length, keys, { required: false });
            if (value) (item as any).sampleValue = value;
            addComponent(item);
            if (type === 'signature') issues.push({ severity: 'warning', message: 'Signature candidate detected; configure Signature Settings separately.', fieldKey: item.key });
            addLedger({ sourceId: `docx-table-${thisTable}-${rowIndex}-${column}`, tableIndex: thisTable, row: rowIndex, column, text: label, status: 'mapped' });
            if (value) {
              const valueColumn = row.indexOf(value, column + 1);
              addLedger({ sourceId: `docx-table-${thisTable}-${rowIndex}-${valueColumn < 0 ? column + 1 : valueColumn}`, tableIndex: thisTable, row: rowIndex, column: valueColumn < 0 ? column + 1 : valueColumn, text: value, status: 'source_sample' });
            }
          });
        });
        issues.push({ severity: 'info', message: 'Detected form-like label/value layout. Source values are temporary samples and are not persisted as template defaults.' });
        return;
      }
      if (classification.kind === 'DATA_TABLE') {
        const header = rows[0] || [];
        const table = makeComponent('table', 'Imported data table', current.title, components.length, keys, { columns: header.map((label, i) => ({ key: slug(label, `column_${i}`), label, type: fieldType(label) as any })) });
        (table as any).sampleRows = rows.slice(1);
        addComponent(table);
        header.forEach((text, column) => addLedger({ sourceId: `docx-table-${thisTable}-0-${column}`, tableIndex: thisTable, row: 0, column, text, status: 'mapped' }));
        rows.slice(1).forEach((row, rowIndex) => row.forEach((text, column) => { if (text) addLedger({ sourceId: `docx-table-${thisTable}-${rowIndex + 1}-${column}`, tableIndex: thisTable, row: rowIndex + 1, column, text, status: 'source_sample' }); }));
        issues.push({ severity: 'info', message: `${classification.reason} Source rows are temporary sample data and will not become template defaults.` });
        return;
      }
      const content = rows.flat().filter(Boolean).join('\n');
      const item = makeParagraph(content, node, classification.reason);
      rows.forEach((row, rowIndex) => row.forEach((value, column) => { if (value) addLedger({ sourceId: `docx-table-${thisTable}-${rowIndex}-${column}`, tableIndex: thisTable, row: rowIndex, column, text: value, status: classification.kind === 'UNRESOLVED_TABLE' ? 'needs_review' : 'mapped' }); }));
      if (classification.kind === 'UNRESOLVED_TABLE') issues.push({ severity: 'warning', message: classification.reason, fieldKey: item.key });
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      makeParagraph(text, node, 'Word list content');
      return;
    }
    const colon = text.indexOf(':');
    const label = colon > 0 ? text.slice(0, colon).trim() : text;
    const placeholder = /_{3,}|\.{3,}/.test(text);
    const signature = /signature|signed by|eis member/i.test(text);
    const date = /^date\s*:?$/i.test(text);
    const fieldCandidate = colon > 0 && colon < 60 && !isSentence(text) && (placeholder || isLabel(label));
    if (signature) { const item = makeComponent('signature', label.replace(/:$/, '') || 'Signature', current.title, components.length, keys); addComponent(item); issues.push({ severity: 'warning', message: 'Signature candidate detected; configure Signature Settings separately.', fieldKey: item.key }); return; }
    if (date && (placeholder || text.length <= 12)) { addComponent(makeComponent('date', 'Date', current.title, components.length, keys)); return; }
    if (fieldCandidate) { const item = makeComponent(fieldType(label), label, current.title, components.length, keys); addComponent(item); issues.push({ severity: 'info', message: `${label} was inferred from a form label/value pattern; verify before creating.`, fieldKey: item.key }); return; }
    makeParagraph(text, node, 'Word text');
  });
  if (doc.body.children.length > MAX_COMPONENTS) issues.push({ severity: 'warning', message: 'The Word document exceeded the safe analysis bound; remaining content was omitted.' });
  if (!components.length) issues.push({ severity: 'warning', message: 'No usable DOCX structure was detected.' });
  const sourceSampleCount = ledger.filter((entry) => entry.status === 'source_sample').length;
  const unresolvedCount = ledger.filter((entry) => entry.status === 'needs_review' || entry.status === 'unresolved').length;
  const docxCoverage = { extractedCellCount: ledger.length, mappedCellCount: ledger.filter((entry) => entry.status === 'mapped').length, sourceSampleCount, unresolvedCount, embeddedImageCount: imageLedger.length, images: imageLedger, ledger };
  return makeProposal(filename, 'docx', sections, components, issues, { sizeBytes, docxCoverage });
}
function analyzeWorkbook(workbook: XLSX.WorkBook, filename: string, sizeBytes: number): ImportProposal {
  const sections: TemplateSection[] = []; const components: TemplateComponent[] = []; const issues: ImportIssue[] = []; const keys = new Set<string>();
  const hidden = new Set((workbook.Workbook?.Sheets || []).filter((sheet) => sheet.Hidden).map((sheet) => sheet.name));
  const sheetNames = workbook.SheetNames.filter((sheetName) => !hidden.has(sheetName));
  if (hidden.size > 0) issues.push({ severity: 'info', message: 'Hidden workbook sheets were not imported.' });
  sheetNames.slice(0, MAX_SECTIONS).forEach((sheetName, sheetIndex) => { const current = makeSection(safeText(sheetName, `Sheet ${sheetIndex + 1}`), sheetIndex); sections.push(current); const sheet = workbook.Sheets[sheetName]; const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', range: 0 }).slice(0, MAX_ROWS); const nonEmpty = rows.filter((row) => row.some((cell) => String(cell).trim() !== '')); const header = nonEmpty[0]?.slice(0, MAX_COLUMNS).map((cell) => safeText(cell).trim()).filter(Boolean) || []; if (header.length >= 2) { const table = makeComponent('table', `${sheetName} table`, current.title, components.length, keys, { columns: header.map((label, i) => ({ key: slug(label, `column_${i}`), label, type: fieldType(label) as any })) }); components.push(table); current.components.push(table); } nonEmpty.slice(header.length >= 2 ? 1 : 0, 21).forEach((row, rowIndex) => row.slice(0, MAX_COLUMNS).forEach((cell, columnIndex) => { const value = safeText(cell).trim(); if (!value || (header.length >= 2 && rowIndex > 0)) return; const label = header[columnIndex] || `Sheet value ${rowIndex + 1}`; const item = makeComponent(fieldType(label), label, current.title, components.length, keys); components.push(item); current.components.push(item); })); const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null; if (range) { const maxRow = Math.min(range.e.r, MAX_ROWS - 1); const maxCol = Math.min(range.e.c, MAX_COLUMNS - 1); if (range.e.r >= MAX_ROWS || range.e.c >= MAX_COLUMNS) issues.push({ severity: 'warning', message: `Sheet ${sheetName} exceeded the safe analysis bound; only the first ${MAX_ROWS} rows and ${MAX_COLUMNS} columns were inspected.` }); for (let row = range.s.r; row <= maxRow; row += 1) for (let col = range.s.c; col <= maxCol; col += 1) { const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })] as XLSX.CellObject | undefined; if (cell?.f) issues.push({ severity: 'warning', message: `Formula detected in ${sheetName}; the value is preserved for manual setup.` }); } } });
  if (sheetNames.length > MAX_SECTIONS) issues.push({ severity: 'warning', message: 'Additional workbook sheets were omitted after the safe section limit.' });
  if (!components.length) issues.push({ severity: 'warning', message: 'No structured rows were detected in the workbook.' }); return makeProposal(filename, 'xlsx', sections, components, issues, { sizeBytes, sheetNames });
}
export async function analyzeTemplateImportInBrowser(file: File): Promise<ImportProposal> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''; if (!SUPPORTED.has(ext)) throw new Error('Unsupported file type. Please upload a digital PDF, DOCX, XLSX, XLS, or WidgetFlow JSON file.'); if (file.size > MAX_BYTES) throw new Error('Files must be 10 MiB or smaller.');
  if (ext === 'pdf') {
    try { return await analyzePdfTemplateImport(file); } catch (error) {
      if (error instanceof Error && error.message === 'PDF_PASSWORD_REQUIRED') throw new Error('This PDF is password-protected. Please provide an unlocked copy before importing.');
      if (error instanceof Error && error.message === 'PDF_NO_TEXT_LAYER') throw new Error('This appears to be a scanned PDF. Scanned PDF import is not supported yet.');
      if (error instanceof Error && error.message === 'PDF_TOO_COMPLEX') throw new Error('This PDF is too complex to analyze safely.');
      throw new Error('WidgetFlow could not read this PDF.');
    }
  }
  if (ext === 'json') { try { const { template, issues } = validateJsonTemplate(JSON.parse(await file.text())); const sections = (template.dynamicSections || []) as TemplateSection[]; const components = (template.components || []) as TemplateComponent[]; const result = makeProposal(file.name, 'json', sections, components, issues, { sizeBytes: file.size }); result.template = template; return result; } catch (error) { if (error instanceof Error && error.message === 'WidgetFlow could not validate this JSON template.') throw error; throw new Error('WidgetFlow could not validate this JSON template.'); } }
  const bytes = await file.arrayBuffer();
  if (ext === 'docx') {
    const embeddedImages: DocxEmbeddedImageEvidence[] = [];
    const result = await mammoth.convertToHtml({ arrayBuffer: bytes }, {
      convertImage: mammoth.images.imgElement((image: any) => image.read('base64').then((base64: string) => {
        const sourceId = `docx-image-${embeddedImages.length + 1}`;
        const dataUrl = `data:${image.contentType || 'application/octet-stream'};base64,${base64}`;
        embeddedImages.push({ sourceId, order: embeddedImages.length, mimeType: image.contentType, dataUrl });
        return { src: dataUrl };
      })),
    });
    return analyzeDocxHtml(result.value, file.name, file.size, embeddedImages);
  }
  return analyzeWorkbook(XLSX.read(bytes, { type: 'array', cellFormula: true }), file.name, file.size);
}
