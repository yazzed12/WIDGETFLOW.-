import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import type { ImportProposal, TemplateComponent, TemplateSection } from '../types';

const MAX_BYTES = 10 * 1024 * 1024;
const supported = new Set(['docx', 'xlsx', 'xls', 'json']);
const keyFor = (label: string, index: number) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `field_${index}`;

export async function analyzeTemplateImportInBrowser(file: File): Promise<ImportProposal> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!supported.has(ext)) throw new Error('Unsupported file type. Please upload a DOCX, XLSX, XLS, or WidgetFlow JSON file.');
  if (file.size > MAX_BYTES) throw new Error('Files must be 10 MiB or smaller.');
  if (ext === 'json') {
    const parsed = JSON.parse(await file.text());
    return { creationMethod: 'import', sourceFilename: file.name, sourceType: 'json', summary: { sectionCount: parsed.dynamicSections?.length ?? 0, fieldCount: parsed.components?.length ?? 0, tableCount: 0, confidence: 'High' }, issues: [], template: parsed };
  }
  let text = '';
  if (ext === 'docx') text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  else { const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; text = XLSX.utils.sheet_to_csv(sheet); }
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const title = lines[0] || file.name.replace(/\.[^.]+$/, '');
  const sections: TemplateSection[] = [{ id: 'sec-import-0', title: 'Document Information', order: 0, components: [] }];
  const components: TemplateComponent[] = [{ id: `comp-title-${crypto.randomUUID()}`, type: 'heading', key: 'doc_heading', label: title, section: sections[0].title, layoutWidth: 'full', layout: { width: 'full' }, order: 0 } as TemplateComponent];
  lines.slice(1).forEach((line, index) => { const colon = line.indexOf(':'); const label = colon > 0 ? line.slice(0, colon).trim() : line; const type = /date/i.test(label) ? 'date' : /amount|cost|price|number|count/i.test(label) ? 'number' : 'text'; components.push({ id: `comp-${crypto.randomUUID()}`, type: type as any, key: keyFor(label, index), label, required: Boolean(colon > 0), section: sections[0].title, layoutWidth: 'half', layout: { width: 'half' }, order: index + 1 } as TemplateComponent); });
  return { creationMethod: 'import', sourceFilename: file.name, sourceType: ext === 'docx' ? 'docx' : 'xlsx', summary: { sectionCount: 1, fieldCount: Math.max(0, components.length - 1), tableCount: ext === 'docx' ? 0 : 1, confidence: components.length > 4 ? 'High' : 'Medium' }, issues: [], template: { name: title, description: `Imported from ${file.name}`, version: 'v1.0', status: 'Draft', creationMethod: 'import', sections: sections.map((s) => s.title), dynamicSections: sections, components } as any };
}
