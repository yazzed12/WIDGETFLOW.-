/** Keep PostgREST IN URLs bounded while retaining stable row order and identities. */
export async function readBatchedByIds<T extends { id: string }>(
  ids: string[],
  read: (batch: string[]) => Promise<T[]>,
  batchSize = 75,
): Promise<T[]> {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error('Invalid batch size');
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return [];
  const batches: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += batchSize) {
    batches.push(uniqueIds.slice(index, index + batchSize));
  }
  const rowsById = new Map<string, T>();
  for (let index = 0; index < batches.length; index += 3) {
    const pages = await Promise.all(batches.slice(index, index + 3).map(read));
    for (const rows of pages) {
      for (const row of rows) if (!rowsById.has(row.id)) rowsById.set(row.id, row);
    }
  }
  return [...rowsById.values()];
}
