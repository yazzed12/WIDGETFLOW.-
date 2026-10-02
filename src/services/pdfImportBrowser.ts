import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { ImportIssue, ImportProposal, TemplateComponent, TemplateSection, WidgetTemplate } from '../types';
import { reconstructPdfLines, reconstructPdfLogicalLines } from './pdfImportModel';
import type { PdfDocumentExtraction, PdfPageEvidence, PdfTextItemEvidence, PdfLine } from './pdfImportModel';

const MAX_PAGES = 100;
const MAX_TEXT_ITEMS = 20000;
const MAX_COMPONENTS = 1000;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractPdfDocument(file: File): Promise<PdfDocumentExtraction> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    loadingTask.onPassword = () => { throw new Error('PDF_PASSWORD_REQUIRED'); };
    const document = await loadingTask.promise;
    const warnings: string[] = [];
    const metadata = await document.getMetadata().then((result) => { const info = result.info as Record<string, unknown>; return { title: typeof info?.Title === 'string' ? info.Title : undefined, author: typeof info?.Author === 'string' ? info.Author : undefined }; }).catch(() => undefined);
    if (document.numPages > MAX_PAGES) throw new Error('PDF_TOO_COMPLEX');
    const pages: PdfPageEvidence[] = [];
    let itemCount = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      const textItems: PdfTextItemEvidence[] = [];
      for (const raw of textContent.items) {
        if (!('str' in raw) || !raw.str.trim()) continue;
        itemCount += 1;
        if (itemCount > MAX_TEXT_ITEMS) throw new Error('PDF_TOO_COMPLEX');
        const transform = raw.transform || [1, 0, 0, 1, 0, 0];
        const x = transform[4];
        const y = viewport.height - transform[5];
        textItems.push({ text: raw.str.slice(0, 10000), x, y, width: raw.width, height: raw.height || Math.abs(transform[3]) || 10, fontName: raw.fontName, page: pageNumber });
      }
      const annotations = (await page.getAnnotations({ intent: 'display' })).slice(0, 200).map((annotation) => {
        const rawOptions = (annotation as { options?: unknown }).options;
        const options = Array.isArray(rawOptions)
          ? rawOptions.map((option) => typeof option === 'string' ? option : (option && typeof option === 'object' && 'exportValue' in option && typeof option.exportValue === 'string' ? option.exportValue : '')).filter(Boolean).slice(0, 100)
          : undefined;
        return { subtype: annotation.subtype, fieldType: annotation.fieldType, fieldName: annotation.fieldName, alternativeText: annotation.alternativeText, exportValue: annotation.exportValue, fieldValue: annotation.fieldValue, options, required: Boolean(annotation.fieldFlags && (annotation.fieldFlags & 2)), radioButton: Boolean(annotation.radioButton), rect: annotation.rect as [number, number, number, number] | undefined };
      });
      if (textItems.length === 0) warnings.push(`Page ${pageNumber} contains no extractable text. Scanned PDF import is not supported.`);
      pages.push({ page: pageNumber, width: viewport.width, height: viewport.height, textItems, annotations });
    }
    if (!pages.some((page) => page.textItems.length > 0)) throw new Error('PDF_NO_TEXT_LAYER');
    return { pageCount: document.numPages, pages, warnings, metadata };
  } catch (error) {
    if (error instanceof Error && ['PDF_PASSWORD_REQUIRED', 'PDF_TOO_COMPLEX', 'PDF_NO_TEXT_LAYER'].includes(error.message)) throw error;
    throw new Error('PDF_UNREADABLE');
  }
}

export async function renderPdfPageToCanvas(file: File, pageNumber: number, canvas: HTMLCanvasElement, scale = 1): Promise<{ width: number; height: number }> {
  const document = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale, rotation: page.rotate || 0 });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
  page.cleanup();
  await document.destroy();
  return { width: viewport.width, height: viewport.height };
}

const slug = (value: string, fallback: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || fallback;
function uniqueKey(label: string, used: Set<string>, fallback: string) { const base = slug(label, fallback); let key = base; let suffix = 2; while (used.has(key)) key = `${base}_${suffix++}`; used.add(key); return key; }
const fieldType = (label: string): TemplateComponent['type'] => /date/i.test(label) ? 'date' : /amount|cost|price|total|currency/i.test(label) ? 'currency' : /count|quantity|number|qty/i.test(label) ? 'number' : /reason|description|comments|notes/i.test(label) ? 'textarea' : 'text';
function idFor(prefix: string, index: number) { return `${prefix}-${index}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now()}`; }
function lineSource(line: PdfLine) { const first = line.items[0]; const last = line.items[line.items.length - 1]; return { sourceId: line.id, sourceIds: line.sourceIds || [line.id], page: line.page, x: first.x, y: first.y, width: Math.max(0, last.x + last.width - first.x), height: Math.max(...line.items.map((item) => item.height)) }; }

const bulletPattern = /^(?:[•·▪◦‣●○■□☐☑-]|\d+[.)])\s+/;
const sentenceEndPattern = /[.!?;:]$/;
const lettersOnly = (value: string) => value.match(/[A-Za-z]/g) || [];
const uppercaseRatio = (value: string) => { const letters = lettersOnly(value); return letters.length ? (value.match(/[A-Z]/g) || []).length / letters.length : 0; };
const styleKey = (line: PdfLine) => `${Math.round((line.items.reduce((sum, item) => sum + item.height, 0) / Math.max(1, line.items.length)) / 2) * 2}:${line.items[0]?.fontName || 'unknown'}:${Math.round((line.items[0]?.x || 0) / 8)}`;

export async function analyzePdfTemplateImport(file: File): Promise<ImportProposal> {
  const extraction = await extractPdfDocument(file);
  const visualLines = reconstructPdfLines(extraction);
  const lines = reconstructPdfLogicalLines(visualLines);
  const issues: ImportIssue[] = extraction.warnings.map((message) => ({ severity: 'warning', message }));
  const sections: TemplateSection[] = [{ id: idFor('pdf-section', 0), title: 'Imported Document', order: 0, components: [] }];
  const components: TemplateComponent[] = [];
  const usedKeys = new Set<string>();
  let current = sections[0];
  const tableRows = new Set<string>();
  const tableHeaders = new Map<string, string[]>();
  for (let index = 0; index < visualLines.length - 2; index += 1) {
    const first = visualLines[index];
    const next = visualLines[index + 1];
    const nextNext = visualLines[index + 2];
    if (first.page !== next.page || next.page !== nextNext.page || first.items.length < 3 || first.items.length !== next.items.length || first.items.length !== nextNext.items.length) continue;
    const aligned = first.items.every((item, column) => Math.abs(item.x - next.items[column].x) < 12 && Math.abs(item.x - nextNext.items[column].x) < 12);
    if (!aligned) continue;
    [first, next, nextNext].forEach((line) => (line.sourceIds || [line.id]).forEach((sourceId) => tableRows.add(sourceId)));
    tableHeaders.set(first.id, first.items.map((item) => item.text).filter(Boolean));
  }
  const medianHeight = [...extraction.pages.flatMap((page) => page.textItems.map((item) => item.height))].sort((a, b) => a - b)[Math.floor(extraction.pages.flatMap((page) => page.textItems).length / 2)] || 10;
  const styleCounts = new Map<string, number>();
  lines.forEach((line) => styleCounts.set(styleKey(line), (styleCounts.get(styleKey(line)) || 0) + 1));
  const headingCandidate = (line: PdfLine) => {
    const text = line.text.trim();
    const words = text.split(/\s+/).filter(Boolean);
    const standalone = text.length <= 100 && words.length <= 10 && !sentenceEndPattern.test(text);
    const uppercase = uppercaseRatio(text) >= 0.68;
    const larger = line.items.some((item) => item.height >= medianHeight * 1.18);
    const repeatedStyle = (styleCounts.get(styleKey(line)) || 0) >= 2 && uppercase;
    return standalone && (uppercase || larger || repeatedStyle) && !bulletPattern.test(text);
  };
  const headingCount = lines.filter(headingCandidate).length;
  const bulletCount = lines.filter((line) => bulletPattern.test(line.text.trim())).length;
  const proseCount = lines.filter((line) => line.text.split(/\s+/).length >= 8).length;
  const documentLike = extraction.pages.every((page) => page.annotations.length === 0)
    && (headingCount >= 2 || (lines.length >= 8 && bulletCount + proseCount >= Math.max(3, Math.floor(lines.length * 0.35))));
  const add = (component: TemplateComponent, source: ReturnType<typeof lineSource>) => {
    const page = extraction.pages.find((candidate) => candidate.page === source.page);
    (component as any).source = page ? { ...source, normalized: { x: source.x / page.width, y: source.y / page.height, width: source.width / page.width, height: source.height / page.height } } : source;
    components.push(component); current.components.push(component);
  };
  lines.forEach((line, index) => {
    if (!line.text || components.length >= MAX_COMPONENTS) return;
    const headerId = (line.sourceIds || [line.id]).find((sourceId) => tableHeaders.has(sourceId));
    if (headerId) {
      const columns = (tableHeaders.get(headerId) || []).map((label, columnIndex) => ({ key: uniqueKey(label, usedKeys, `pdf_column_${columnIndex}`), label, type: fieldType(label) as any }));
      const table: TemplateComponent = { id: idFor('pdf-component', index), type: 'table', key: uniqueKey(line.text, usedKeys, `pdf_table_${index}`), label: 'Detected PDF table', section: current.title, order: current.components.length, layoutWidth: 'full', layout: { width: 'full' }, columns };
      add(table, lineSource(line));
      issues.push({ severity: 'info', message: 'A repeated aligned-column region was detected as a table; verify its headers and rows before creating.', fieldKey: table.key });
      return;
    }
    if ((line.sourceIds || [line.id]).some((sourceId) => tableRows.has(sourceId))) return;
    const source = lineSource(line);
    const isHeading = headingCandidate(line);
    if (isHeading) {
      if (components.length > 0 || current.components.length > 0) {
        current = { id: idFor('pdf-section', sections.length), title: line.text, order: sections.length, components: [] };
        sections.push(current);
      } else {
        current.title = line.text;
      }
      add({ id: idFor('pdf-component', index), type: 'heading', key: uniqueKey(line.text, usedKeys, `pdf_heading_${index}`), label: line.text, section: current.title, order: current.components.length, layoutWidth: 'full', layout: { width: 'full' } }, source);
      return;
    }
    const checkbox = /[☐☑□]/.test(line.text);
    const blank = /_{3,}|\.{3,}/.test(line.text);
    const colon = line.text.indexOf(':');
    const explicitBlank = /(?:_{3,}|\.{3,})/.test(line.text) || /:\s*$/.test(line.text);
    const strongFieldEvidence = !documentLike && explicitBlank;
    if (checkbox) {
      const options = line.text.split(/[☐☑□]/).map((value) => value.trim()).filter(Boolean);
      add({ id: idFor('pdf-component', index), type: options.length > 1 ? 'select' : 'checkbox', key: uniqueKey(line.text.replace(/[☐☑□]/g, ''), usedKeys, `pdf_choice_${index}`), label: line.text.replace(/[☐☑□].*$/, '').trim() || 'PDF choice', options: options.length > 1 ? options : undefined, section: current.title, order: current.components.length, layoutWidth: 'half', layout: { width: 'half' } }, source);
      issues.push({ severity: 'info', message: 'Checkbox evidence detected; verify the intended choice behavior.', fieldKey: components[components.length - 1].key });
    } else if (strongFieldEvidence && (blank || (colon > 0 && colon < 60))) {
      const label = (colon > 0 ? line.text.slice(0, colon) : line.text.replace(/[_.]+/g, '')).trim();
      const type = fieldType(label);
      add({ id: idFor('pdf-component', index), type, key: uniqueKey(label, usedKeys, `pdf_field_${index}`), label, required: false, section: current.title, order: current.components.length, layoutWidth: type === 'textarea' ? 'full' : 'half', layout: { width: type === 'textarea' ? 'full' : 'half' } }, source);
      issues.push({ severity: 'info', message: `${label || 'A blank area'} was inferred as a ${type} field from PDF layout evidence; verify before creating.`, fieldKey: components[components.length - 1].key });
    } else if (/manager signature|employee signature|authorized by|signed by|signature/i.test(line.text)) {
      add({ id: idFor('pdf-component', index), type: 'signature', key: uniqueKey(line.text, usedKeys, `pdf_signature_${index}`), label: line.text, section: current.title, order: current.components.length, layoutWidth: 'half', layout: { width: 'half' } }, source);
      issues.push({ severity: 'warning', message: 'This signature label requires configuration; no role or signer was assigned.', fieldKey: components[components.length - 1].key });
    } else {
      add({ id: idFor('pdf-component', index), type: 'paragraph', key: uniqueKey(line.text.slice(0, 40), usedKeys, `pdf_text_${index}`), label: line.text.slice(0, 10000), section: current.title, order: current.components.length, layoutWidth: 'full', layout: { width: 'full' }, paragraphConfig: { contentHtml: `<p>${line.text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character))}</p>` } }, source);
    }
  });
  const overlap = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => {
    const intersectionWidth = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const intersectionHeight = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    const intersection = intersectionWidth * intersectionHeight;
    return intersection / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
  };
  extraction.pages.forEach((page) => page.annotations.forEach((annotation, annotationIndex) => {
    if (!annotation.rect || components.length >= MAX_COMPONENTS) return;
    const [x1, y1, x2, y2] = annotation.rect;
    const x = Math.max(0, Math.min(x1, x2));
    const y = Math.max(0, page.height - Math.max(y1, y2));
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const fieldName = annotation.alternativeText || annotation.fieldName || `PDF field ${annotationIndex + 1}`;
    const type = annotation.fieldType === 'Sig' ? 'signature' : annotation.fieldType === 'Btn' ? (annotation.radioButton ? 'radio' : 'checkbox') : annotation.fieldType === 'Ch' ? 'select' : annotation.fieldType === 'Tx' ? 'text' : null;
    if (!type) return;
    const key = uniqueKey(fieldName, usedKeys, `pdf_form_${annotationIndex}`);
    const options = annotation.options && annotation.options.length > 0
      ? annotation.options
      : annotation.fieldType === 'Ch' && annotation.exportValue ? [annotation.exportValue] : undefined;
    const sourceBox = { x, y, width, height };
    const existing = components.find((candidate) => {
      const source = (candidate as TemplateComponent & { source?: { page?: number; x?: number; y?: number; width?: number; height?: number } }).source;
      return source?.page === page.page && typeof source.x === 'number' && typeof source.y === 'number' && typeof source.width === 'number' && typeof source.height === 'number' && overlap(sourceBox, { x: source.x, y: source.y, width: source.width, height: source.height }) >= 0.45;
    });
    if (existing) {
      existing.type = type;
      existing.required = annotation.required === true;
      existing.options = options;
      const hasHumanReadableAnnotationLabel = Boolean(annotation.alternativeText) || !/^(field|widget|text|checkbox|radio|select|signature)[_ -]?\d*$/i.test(fieldName);
      if (hasHumanReadableAnnotationLabel || !existing.label) existing.label = fieldName;
      existing.key = key;
      const normalized = { x: x / page.width, y: y / page.height, width: width / page.width, height: height / page.height };
      (existing as any).source = { ...(existing as any).source, page: page.page, x, y, width, height, normalized, annotationId: annotation.fieldName, sourceType: 'PDF_ACROFORM' };
      issues.push({ severity: type === 'signature' ? 'warning' : 'info', message: type === 'signature' ? 'PDF signature field detected; configure signer settings in WidgetFlow.' : 'Interactive PDF form field refined an existing visual proposal.', fieldKey: existing.key });
      return;
    }
    const component: TemplateComponent = { id: idFor('pdf-form', annotationIndex), type, key, label: fieldName, required: annotation.required === true, section: current.title, order: current.components.length, layoutWidth: 'half', layout: { width: 'half' }, options };
    const normalized = { x: x / page.width, y: y / page.height, width: width / page.width, height: height / page.height };
    (component as any).source = { page: page.page, x, y, width, height, normalized, annotationId: annotation.fieldName, sourceType: 'PDF_ACROFORM' };
    components.push(component); current.components.push(component);
    issues.push({ severity: type === 'signature' ? 'warning' : 'info', message: type === 'signature' ? 'PDF signature field detected; configure signer settings in WidgetFlow.' : 'Interactive PDF form field detected and mapped as stronger structural evidence.', fieldKey: key });
  }));
  if (components.length >= MAX_COMPONENTS) issues.push({ severity: 'warning', message: 'PDF structure exceeded the safe analysis bound; remaining content was omitted.' });
  const componentBySource = new Map<string, TemplateComponent>();
  components.forEach((component) => {
    const source = (component as any).source as { sourceId?: string; sourceIds?: string[] } | undefined;
    (source?.sourceIds || (source?.sourceId ? [source.sourceId] : [])).forEach((sourceId) => componentBySource.set(sourceId, component));
  });
  const ledger = visualLines.filter((line) => line.text.trim().length > 1).map((line) => {
    const source = lineSource(line);
    const component = componentBySource.get(line.id);
    const page = extraction.pages.find((candidate) => candidate.page === line.page);
    const status: 'mapped' | 'needs_review' | 'unmapped' = !component ? 'unmapped' : ['heading', 'paragraph'].includes(component.type) ? 'mapped' : 'needs_review';
    return { sourceId: line.id, page: line.page, text: line.text, status, x: source.x, y: source.y, width: source.width, height: source.height, normalized: page ? { x: source.x / page.width, y: source.y / page.height, width: source.width / page.width, height: source.height / page.height } : undefined };
  });
  const pageCoverage = extraction.pages.map((page) => {
    const pageEntries = ledger.filter((entry) => entry.page === page.page);
    return { page: page.page, mapped: pageEntries.filter((entry) => entry.status === 'mapped').length, needsReview: pageEntries.filter((entry) => entry.status === 'needs_review').length, unmapped: pageEntries.filter((entry) => entry.status === 'unmapped').length, ignored: 0 };
  });
  const pdfCoverage = { extractedBlockCount: ledger.length, mappedBlockCount: ledger.filter((entry) => entry.status === 'mapped').length, needsReviewCount: ledger.filter((entry) => entry.status === 'needs_review').length, unmappedBlockCount: ledger.filter((entry) => entry.status === 'unmapped').length, ledger, pages: pageCoverage };
  if (pdfCoverage.unmappedBlockCount > 0) issues.push({ severity: 'warning', message: `${pdfCoverage.unmappedBlockCount} extracted PDF source block(s) remain unmapped; review them before creating.` });
  const suggestedName = extraction.metadata?.title?.trim() || file.name.replace(/[.][^/.]+$/, '');
  const template: Partial<WidgetTemplate> = { name: suggestedName, description: `Imported from digital PDF (${file.name})`, version: 'v1.0', status: 'Draft', creationMethod: 'import', sections: sections.map((section) => section.title), dynamicSections: sections, components, fields: components as any };
  return { creationMethod: 'import', sourceFilename: file.name, sourceType: 'pdf', summary: { sectionCount: sections.length, fieldCount: components.filter((component) => !['heading', 'paragraph'].includes(component.type)).length, tableCount: components.filter((component) => component.type === 'table').length, confidence: issues.some((issue) => issue.severity === 'warning') ? 'Needs Review' : 'Medium' }, issues, sourceMetadata: { sizeBytes: file.size, pageCount: extraction.pageCount, pdfPages: extraction.pages.map((page) => ({ page: page.page, width: page.width, height: page.height, textItemCount: page.textItems.length })), pdfWarnings: extraction.warnings, pdfTitle: extraction.metadata?.title, pdfAuthor: extraction.metadata?.author, pdfCoverage }, template };
}
