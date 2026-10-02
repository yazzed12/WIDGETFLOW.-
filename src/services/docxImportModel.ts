export type DocxTableClassification = 'FORM_GRID' | 'DATA_TABLE' | 'CONTENT_TABLE' | 'UNRESOLVED_TABLE';

export function classifyDocxTableRows(rows: string[]): DocxTableClassification {
  const parsed = rows.map((row) => row.split('\t').map((cell) => cell.trim()));
  const nonEmpty = parsed.filter((row) => row.some(Boolean));
  const widths = nonEmpty.map((row) => row.length);
  const isLabel = (value: string) => /:$/.test(value) || /^[A-Za-z][A-Za-z /&()#-]{2,60}$/i.test(value) || /employee|department|directorate|manager|location|building|user id|serial|quantity|item/i.test(value);
  const layoutLabel = /^(temporary|permanent|allocation\s*type|from|to|eis\s*member|signature|date|signed\s*by)$/i;
  const formLike = nonEmpty.flat().filter(Boolean);
  if (formLike.filter((value) => isLabel(value) || layoutLabel.test(value)).length >= 2 && formLike.some((value) => layoutLabel.test(value))) return 'FORM_GRID';
  const bilingual = nonEmpty.some((row) => row.some((value) => /[\u0600-\u06ff]/.test(value))) && nonEmpty.some((row) => row.length > 1);
  if (bilingual) return 'CONTENT_TABLE';
  const form = nonEmpty.length >= 2 && widths.every((width) => width >= 2 && width % 2 === 0) && nonEmpty.every((row) => row.filter((_, index) => index % 2 === 0).every((value) => isLabel(value)));
  if (form) return 'FORM_GRID';
  const header = nonEmpty[0] || [];
  const body = nonEmpty.slice(1);
  const data = header.length >= 2 && body.length >= 2 && header.every((value) => value.length <= 80 && value.split(/\s+/).length <= 12) && body.every((row) => row.length === header.length);
  if (data) return 'DATA_TABLE';
  const longText = nonEmpty.some((row) => row.some((value) => value.split(/\s+/).length > 12 || /[\u0600-\u06ff]/.test(value)));
  if (longText) return 'CONTENT_TABLE';
  return 'UNRESOLVED_TABLE';
}
