/** Values that are intentionally safe to expose to user-facing search. */
export type SearchFieldValue = string | number | null | undefined;

/** Normalize user input and searchable display text consistently. */
export function normalizeSearchText(value: SearchFieldValue): string {
  return String(value ?? '').trim().toLowerCase();
}

/** Build a searchable document from explicitly selected, user-facing fields. */
export function buildSearchDocument(values: readonly SearchFieldValue[]): string[] {
  return values.map(normalizeSearchText).filter(Boolean);
}

/**
 * Match every query token against at least one field (case-insensitive,
 * substring matching). Empty queries match all records subject to page filters.
 */
export function matchesSearch(query: SearchFieldValue, values: readonly SearchFieldValue[]): boolean {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const document = buildSearchDocument(values);
  return tokens.every((token) => document.some((field) => field.includes(token)));
}
