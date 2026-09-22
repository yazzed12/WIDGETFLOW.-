/** Render persisted timestamps as readable local date/time without exposing ISO strings. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}
