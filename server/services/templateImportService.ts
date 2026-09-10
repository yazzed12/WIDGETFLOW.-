import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { validateDynamicTemplateSchema } from './componentRegistry.js';
import type { WidgetTemplate, TemplateComponent, TemplateSection } from '../../src/types/index.js';
import { AppError } from '../middleware/errorHandler.js';

export interface ImportIssue {
  severity: 'info' | 'warning';
  message: string;
  fieldKey?: string;
}

export interface ImportProposal {
  creationMethod: 'import' | 'ai';
  sourceFilename: string;
  sourceType: 'docx' | 'xlsx' | 'json';
  summary: {
    sectionCount: number;
    fieldCount: number;
    tableCount: number;
    confidence: 'High' | 'Medium' | 'Needs Review';
  };
  issues: ImportIssue[];
  template: Partial<WidgetTemplate>;
}

export const templateImportService = {
  // 1. Analyze Uploaded File (DOCX / XLSX / JSON)
  async analyzeUploadedFile(file: Express.Multer.File): Promise<ImportProposal> {
    const filename = file.originalname || 'imported_document';
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    try {
      if (ext === 'docx') {
        const buffer = file.buffer;
        return await this.analyzeDocx(buffer, filename);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = file.buffer;
        return this.analyzeXlsx(buffer, filename);
      } else if (ext === 'json') {
        const content = file.buffer.toString('utf8');
        return this.analyzeJson(content, filename);
      } else {
        throw new AppError('Unsupported file type. Please upload a DOCX, XLSX, or WidgetFlow JSON file.', 400, 'UNSUPPORTED_FORMAT');
      }
    } finally {
      // Memory-backed uploads are released after this request; no persistent
      // or temporary filesystem cleanup is required.
    }
  },

  // 2. Parse DOCX Intake Pipeline
  async analyzeDocx(buffer: Buffer, filename: string): Promise<ImportProposal> {
    const rawResult = await mammoth.extractRawText({ buffer });
    const htmlResult = await mammoth.convertToHtml({ buffer });

    const rawText = rawResult.value || '';
    const htmlText = htmlResult.value || '';

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const docTitle = lines[0] || filename.replace(/\.[^/.]+$/, '');
    const sections: TemplateSection[] = [];
    const components: TemplateComponent[] = [];
    const issues: ImportIssue[] = [];

    let currentSectionName = 'Document Information';
    sections.push({ id: 'sec-import-0', title: currentSectionName, order: 0, components: [] });

    let compOrder = 0;

    // Title Heading Component
    components.push({
      id: `comp-title-${Date.now()}`,
      type: 'heading',
      key: 'doc_heading',
      label: docTitle,
      section: currentSectionName,
      layoutWidth: 'full',
      layout: { width: 'full' },
      order: compOrder++,
    });

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Detect Section Heading (All CAPS or ends with colon or heading tags in HTML)
      if (line.length < 40 && (line === line.toUpperCase() || line.startsWith('#') || line.endsWith(':'))) {
        const secTitle = line.replace(/[:#]/g, '').trim();
        if (secTitle && secTitle.length > 2 && !sections.some((s) => s.title.toLowerCase() === secTitle.toLowerCase())) {
          currentSectionName = secTitle;
          sections.push({ id: `sec-import-${sections.length}`, title: currentSectionName, order: sections.length, components: [] });
          continue;
        }
      }

      // Checkbox choices (☐ or [ ] or ( ))
      if (/^[☐\[\(]/.test(line) || line.includes('☐') || line.includes('[ ]')) {
        const options = line
          .split(/[☐\[\]\(\)]/)
          .map((o) => o.trim())
          .filter(Boolean);

        if (options.length > 0) {
          const key = `choice_${compOrder}`;
          components.push({
            id: `comp-${Date.now()}-${compOrder}`,
            type: 'select',
            key,
            label: 'Selection Choice',
            required: false,
            options,
            section: currentSectionName,
            layoutWidth: 'full',
            layout: { width: 'full' },
            order: compOrder++,
          });
          continue;
        }
      }

      // Label with blank underline or colon: e.g. "Employee Name: _____________"
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1 && colonIdx < 50) {
        const label = line.substring(0, colonIdx).trim();
        const remainder = line.substring(colonIdx + 1).trim();

        const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `field_${compOrder}`;

        let fieldType: TemplateComponent['type'] = 'text';
        if (/date/i.test(label)) fieldType = 'date';
        else if (/amount|cost|price|salary|fee/i.test(label)) fieldType = 'currency';
        else if (/count|quantity|number/i.test(label)) fieldType = 'number';
        else if (/reason|description|comments|notes|justification/i.test(label)) fieldType = 'textarea';

        components.push({
          id: `comp-${Date.now()}-${compOrder}`,
          type: fieldType,
          key,
          label,
          required: true,
          section: currentSectionName,
          layoutWidth: fieldType === 'textarea' ? 'full' : 'half',
          layout: { width: fieldType === 'textarea' ? 'full' : 'half' },
          order: compOrder++,
        });
        continue;
      }

      // Fillable Blanks (_______)
      if (line.includes('____') || line.includes('.....')) {
        const cleanLabel = line.replace(/[_.]/g, '').trim() || `Information Field ${compOrder}`;
        const key = cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `blank_${compOrder}`;

        components.push({
          id: `comp-${Date.now()}-${compOrder}`,
          type: 'text',
          key,
          label: cleanLabel,
          required: false,
          section: currentSectionName,
          layoutWidth: 'half',
          layout: { width: 'half' },
          order: compOrder++,
        });
        continue;
      }

      // Standard Paragraph text
      if (line.length > 2) {
        components.push({
          id: `comp-${Date.now()}-${compOrder}`,
          type: 'paragraph',
          key: `text_p_${compOrder}`,
          label: line,
          section: currentSectionName,
          layoutWidth: 'full',
          layout: { width: 'full' },
          order: compOrder++,
        });
      }
    }

    if (components.length === 1) {
      issues.push({ severity: 'warning', message: 'Limited form structure detected in Word document. Generic fields created.' });
    }

    const template: Partial<WidgetTemplate> = {
      name: docTitle,
      description: `Imported from Word document (${filename})`,
      version: 'v1.0',
      status: 'Draft',
      creationMethod: 'import',
      sections: sections.map((s) => s.title),
      dynamicSections: sections,
      components,
    };

    return {
      creationMethod: 'import',
      sourceFilename: filename,
      sourceType: 'docx',
      summary: {
        sectionCount: sections.length,
        fieldCount: components.filter((c) => c.type !== 'heading' && c.type !== 'paragraph').length,
        tableCount: 0,
        confidence: components.length > 4 ? 'High' : 'Medium',
      },
      issues,
      template,
    };
  },

  // 3. Parse XLSX Intake Pipeline
  analyzeXlsx(buffer: Buffer, filename: string): ImportProposal {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const docTitle = filename.replace(/\.[^/.]+$/, '');

    const sections: TemplateSection[] = [
      { id: 'sec-xl-0', title: 'Header Information', order: 0, components: [] },
      { id: 'sec-xl-1', title: 'Tabular Line Items', order: 1, components: [] },
    ];

    const components: TemplateComponent[] = [];
    const issues: ImportIssue[] = [];

    let compOrder = 0;
    let tableDetected = false;

    // Scan top rows for scalar label/value pairs (e.g. Employee Name | Ahmed)
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      if (row.length === 2 || (row[0] && row[1] && row.length <= 4)) {
        const label = String(row[0]).trim();
        const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

        if (label && key && key.length > 1) {
          components.push({
            id: `comp-xl-${compOrder}`,
            type: /date/i.test(label) ? 'date' : /cost|price|total|amount/i.test(label) ? 'currency' : 'text',
            key,
            label,
            required: true,
            section: 'Header Information',
            layoutWidth: 'half',
            layout: { width: 'half' },
            order: compOrder++,
          });
        }
      }
    }

    // Scan for structured tabular regions (header row + multiple values)
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (row && row.length >= 3 && row.every((cell) => typeof cell === 'string')) {
        // Table header row detected!
        const colHeaders = row.map((c) => String(c).trim()).filter(Boolean);
        const parsedColumns = colHeaders.map((col, idx) => ({
          key: col.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `col_${idx}`,
          label: col,
          type: (/cost|price|amount|total/i.test(col) ? 'currency' : /qty|quantity|count/i.test(col) ? 'number' : 'text') as any,
        }));

        const safeColumns =
          parsedColumns.length > 0
            ? parsedColumns
            : [
                { key: 'item', label: 'Item / Description', type: 'text' },
                { key: 'quantity', label: 'Quantity', type: 'number' },
                { key: 'unit_cost', label: 'Unit Cost ($)', type: 'currency' },
              ];

        components.push({
          id: `comp-table-${Date.now()}`,
          type: 'table',
          key: 'line_items_table',
          label: 'Tabular Line Items',
          section: 'Tabular Line Items',
          layoutWidth: 'full',
          layout: { width: 'full' },
          columns: safeColumns,
          order: compOrder++,
        });

        tableDetected = true;
        break;
      }
    }

    if (!tableDetected && components.length === 0) {
      issues.push({ severity: 'warning', message: 'Could not detect structured form regions in Excel spreadsheet. Basic fields generated.' });
    }

    const template: Partial<WidgetTemplate> = {
      name: docTitle,
      description: `Imported from Excel spreadsheet (${filename})`,
      version: 'v1.0',
      status: 'Draft',
      creationMethod: 'import',
      sections: sections.map((s) => s.title),
      dynamicSections: sections,
      components,
    };

    return {
      creationMethod: 'import',
      sourceFilename: filename,
      sourceType: 'xlsx',
      summary: {
        sectionCount: sections.length,
        fieldCount: components.length,
        tableCount: tableDetected ? 1 : 0,
        confidence: components.length > 2 ? 'High' : 'Medium',
      },
      issues,
      template,
    };
  },

  // 4. Parse WidgetFlow JSON Export
  analyzeJson(jsonString: string, filename: string): ImportProposal {
    const parsed = JSON.parse(jsonString);
    const result = validateDynamicTemplateSchema(parsed);
    if (!result.valid) {
      throw new AppError(`Invalid template schema: ${result.errors.map((e) => e.message).join('; ')}`, 400, 'INVALID_SCHEMA');
    }

    return {
      creationMethod: 'import',
      sourceFilename: filename,
      sourceType: 'json',
      summary: {
        sectionCount: parsed.sections?.length || parsed.dynamicSections?.length || 1,
        fieldCount: parsed.components?.length || 0,
        tableCount: (parsed.components || []).filter((c: any) => c.type === 'table').length || 0,
        confidence: 'High',
      },
      issues: [],
      template: {
        ...parsed,
        status: 'Draft',
        creationMethod: 'import',
      },
    };
  },
};
