import assert from 'node:assert/strict';
import { loadWorkspaceTemplateCollections } from '../../src/features/templates/repositories/templateRepository.ts';

const row = (id: string, status: string) => ({
  id, status, name: id, category_id: 'category-1', created_by_user_id: 'actor-1',
  creator_name: 'Actor', creator_role_name: 'Employee', created_at: '2026-01-01', updated_at: '2026-01-01',
});

function fakeClient(visibleRows: ReturnType<typeof row>[]) {
  const calls: Array<{ table: string; ids?: string[] }> = [];
  const client = {
    from(table: string) {
      let status: string | null = null;
      let ids: string[] | null = null;
      const query = {
        select(_columns: string) { return query; },
        eq(_column: string, value: string) { status = value; return query; },
        in(_column: string, value: string[]) { ids = value; return query; },
        order(_column: string, _options?: unknown) { return query; },
        then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          calls.push({ table, ids: ids ?? undefined });
          const data = table === 'templates'
            ? visibleRows.filter((entry) => !status || entry.status === status)
            : (ids ?? []).map((id) => ({ id: `${table}-${id}`, template_id: id,
                section_id: `template_sections-${id}`, name: 'Section', tag: 'tag', display_order: 0 }));
          return Promise.resolve({ data, error: null, status: 200 }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { client, calls };
}

const first = fakeClient([row('approved-1', 'approved'), row('pending-2', 'pending_approval')]);
const collections = await loadWorkspaceTemplateCollections(first.client, true);
assert.deepEqual(collections.approved.map((item) => item.id), ['approved-1']);
assert.deepEqual(collections.owned.map((item) => item.id), ['approved-1', 'pending-2']);
assert.deepEqual(collections.pending.map((item) => item.id), ['pending-2']);
assert.equal(collections.approved[0]?.dynamicSections?.length, 1);
assert.equal(first.calls.filter((call) => call.table === 'templates').length, 3);
for (const table of ['template_sections', 'template_fields', 'template_tags']) {
  const reads = first.calls.filter((call) => call.table === table);
  assert.equal(reads.length, 1, `${table} loaded once for the union`);
  assert.deepEqual(reads[0]?.ids, ['approved-1', 'pending-2']);
}

const changedContext = fakeClient([row('other-3', 'approved')]);
const next = await loadWorkspaceTemplateCollections(changedContext.client, true);
assert.deepEqual(next.owned.map((item) => item.id), ['other-3']);
assert.equal(changedContext.calls.filter((call) => call.table === 'template_sections').length, 1);
console.log('Phase 109B template workspace hydration runtime checks passed');
