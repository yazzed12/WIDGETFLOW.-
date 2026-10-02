export interface PdfTextItemEvidence {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
  page: number;
}
export interface PdfPageEvidence {
  page: number;
  width: number;
  height: number;
  textItems: PdfTextItemEvidence[];
  annotations: Array<{ subtype?: string; fieldType?: string; fieldName?: string; alternativeText?: string; exportValue?: string; fieldValue?: unknown; options?: string[]; required?: boolean; radioButton?: boolean; rect?: [number, number, number, number] }>;
}
export interface PdfDocumentExtraction {
  pageCount: number;
  pages: PdfPageEvidence[];
  warnings: string[];
  metadata?: { title?: string; author?: string };
}
export interface PdfLine { id: string; page: number; text: string; items: PdfTextItemEvidence[]; y: number; sourceIds?: string[]; }
export function reconstructPdfLines(extraction: PdfDocumentExtraction): PdfLine[] {
  const lines: PdfLine[] = [];
  for (const page of extraction.pages) {
    const sorted = [...page.textItems].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const item of sorted) {
      let line = lines.find((candidate) => {
        if (candidate.page !== page.page || Math.abs(candidate.y - item.y) > Math.max(4, item.height * 0.45)) return false;
        const last = candidate.items[candidate.items.length - 1];
        const columnGap = Math.max(80, page.width * 0.25);
        return item.x <= last.x + last.width + columnGap;
      });
      if (!line) { line = { id: `pdf-source-p${page.page}-line-${lines.filter((candidate) => candidate.page === page.page).length + 1}`, page: page.page, text: '', items: [], y: item.y, sourceIds: [] }; lines.push(line); }
      line.items.push(item);
      line.items.sort((a, b) => a.x - b.x);
      line.text = line.items.map((part) => part.text).join(' ').replace(/\s+/g, ' ').trim();
    }
  }
  return lines.slice(0, 10000);
}

const bulletPattern = /^(?:[•·▪◦‣●○■□☐☑-]|\d+[.)])\s+/;
const sentenceEndPattern = /[.!?;:]$/;

function averageHeight(line: PdfLine): number {
  return line.items.reduce((sum, item) => sum + item.height, 0) / Math.max(1, line.items.length);
}

function leftIndent(line: PdfLine): number {
  return line.items[0]?.x ?? 0;
}

function looksLikeStandaloneHeading(line: PdfLine, medianHeight: number): boolean {
  const words = line.text.trim().split(/\s+/).filter(Boolean);
  const letters = line.text.match(/[A-Za-z]/g) || [];
  const upper = line.text.match(/[A-Z]/g) || [];
  const uppercaseRatio = letters.length ? upper.length / letters.length : 0;
  return words.length <= 10
    && line.text.length <= 100
    && (uppercaseRatio >= 0.72 || averageHeight(line) >= medianHeight * 1.28)
    && !sentenceEndPattern.test(line.text.trim());
}

/**
 * Groups visual PDF lines into logical paragraph/list lines while preserving
 * every physical source id for coverage and overlay provenance.
 */
export function reconstructPdfLogicalLines(lines: PdfLine[]): PdfLine[] {
  if (lines.length < 2) return lines.map((line) => ({ ...line, sourceIds: [line.id] }));
  const heights = lines.map(averageHeight).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 10;
  const logical: PdfLine[] = [];
  for (const line of lines) {
    const previous = logical[logical.length - 1];
    const lineItems = line.items;
    const previousItems = previous?.items || [];
    const verticalGap = previous ? line.y - previous.y : Infinity;
    const samePage = previous?.page === line.page;
    const sameIndent = previous ? Math.abs(leftIndent(line) - leftIndent(previous)) <= 14 : false;
    const sameStyle = previous ? Math.abs(averageHeight(line) - averageHeight(previous)) <= Math.max(2, medianHeight * 0.25) : false;
    const lineIsBullet = bulletPattern.test(line.text.trim());
    const previousIsBullet = previous ? bulletPattern.test(previous.text.trim()) : false;
    const headingBoundary = looksLikeStandaloneHeading(line, medianHeight) || (previous ? looksLikeStandaloneHeading(previous, medianHeight) : false);
    const continuationOfBullet = Boolean(previousIsBullet && !lineIsBullet && !sentenceEndPattern.test(previous?.text.trim() || ''));
    const canMerge = Boolean(previous && samePage && sameIndent && sameStyle && !lineIsBullet && (!previousIsBullet || continuationOfBullet) && !headingBoundary
      && verticalGap <= Math.max(24, medianHeight * 2.25)
      && !sentenceEndPattern.test(previous.text.trim())
      && lineItems.length > 0 && previousItems.length > 0);
    if (canMerge) {
      previous.items = [...previous.items, ...line.items];
      previous.text = `${previous.text} ${line.text}`.replace(/\s+/g, ' ').trim();
      previous.sourceIds = [...(previous.sourceIds || [previous.id]), line.id];
    } else {
      logical.push({ ...line, sourceIds: [line.id] });
    }
  }
  return logical;
}
