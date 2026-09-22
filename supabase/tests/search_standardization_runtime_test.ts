import assert from 'node:assert/strict';
import { matchesSearch } from '../../src/features/search/searchMatcher';

const reportId = 'RPT-DR003-2026-000124';
const templateId = 'TMP-EM012-MG007-2026-000042';
const internalUuid = '11111111-1111-4111-8111-111111111111';

assert.equal(matchesSearch('rpt-dr003', [reportId, 'Quarterly report']), true);
assert.equal(matchesSearch('DR003', [reportId]), true);
assert.equal(matchesSearch('MG007', [templateId]), true);
assert.equal(matchesSearch(templateId, [templateId]), true);
assert.equal(matchesSearch('monthly DR003', ['Monthly Operations', reportId]), true);
assert.equal(matchesSearch('', ['anything']), true);
assert.equal(matchesSearch(internalUuid, ['Quarterly report', reportId]), false);
assert.equal(matchesSearch('monthly missing', ['Monthly Operations', reportId]), false);
assert.equal(matchesSearch('monthly', [null, undefined, 'Monthly Operations']), true);
assert.equal(matchesSearch('operations', ['Monthly Operations', null]), true);

console.log('search standardization runtime test passed');
