import assert from 'node:assert/strict';
import { readBatchedByIds } from '../../src/features/workspace/batchedRead.ts';

type Row = { id: string; recipientUserId: string };
const batches: string[][] = [];
const read = async (ids: string[]): Promise<Row[]> => {
  batches.push(ids);
  return ids.map((id) => ({ id: `mapping-${id}`, recipientUserId: `recipient-${id}` }));
};
assert.deepEqual(await readBatchedByIds([], read, 2), []);
assert.equal(batches.length, 0);
assert.deepEqual(await readBatchedByIds(['a'], read, 2), [{ id: 'mapping-a', recipientUserId: 'recipient-a' }]);
assert.deepEqual((await readBatchedByIds(['a', 'b', 'c', 'd', 'e', 'a'], read, 2)).map((row) => row.id),
  ['mapping-a', 'mapping-b', 'mapping-c', 'mapping-d', 'mapping-e']);
assert.deepEqual(batches.slice(1), [['a', 'b'], ['c', 'd'], ['e']]);
const repeated = await readBatchedByIds(['a', 'b', 'c'], async (ids) => [
  { id: 'same-row', recipientUserId: 'original-recipient' },
  { id: ids[0], recipientUserId: 'recipient-' + ids[0] },
], 1);
assert.deepEqual(repeated.map((row) => row.id), ['same-row', 'a', 'b', 'c']);
assert.equal(repeated[0]?.recipientUserId, 'original-recipient');
await assert.rejects(() => readBatchedByIds(['a', 'b'], async () => { throw new Error('query failed'); }, 1), /query failed/);
console.log('Phase 109B signature assignment batching runtime checks passed');
