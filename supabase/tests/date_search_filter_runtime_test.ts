import assert from 'node:assert/strict';
import {
  dayRange,
  hoursRange,
  lastSevenDaysRange,
  matchesDateRange,
  monthRange,
  weekSegments,
} from '../../src/features/search/dateRangeFilter';
import { matchesSearch } from '../../src/features/search/searchMatcher';
import { formatDateTime } from '../../src/shared/dateTime';

const month = monthRange(2026, 4);
assert.equal(matchesDateRange('2026-05-01T00:00:00Z', month), true);
assert.equal(matchesDateRange('2026-05-15T12:00:00Z', month), true);
assert.equal(matchesDateRange('2026-05-31T12:00:00Z', month), true);
assert.equal(matchesDateRange('2026-04-30T12:00:00Z', month), false);
assert.equal(matchesDateRange('2026-06-01T12:00:00Z', month), false);

const rollingNow = new Date(2026, 8, 16, 12, 0);
const rolling = lastSevenDaysRange(rollingNow);
assert.equal(rolling.start.getTime(), new Date(2026, 8, 10).getTime());
assert.equal(rolling.end.getTime(), new Date(2026, 8, 17).getTime());
assert.equal(matchesDateRange('2026-09-10T00:00:00', rolling), true);
assert.equal(matchesDateRange('2026-09-17T00:00:00', rolling), false);

const segments = weekSegments(2026, 8);
assert.equal(segments.length, 5);
assert.equal(segments[2].start.getTime(), new Date(2026, 8, 14).getTime());
assert.equal(segments[2].end.getTime(), new Date(2026, 8, 21).getTime());
assert.equal(matchesDateRange('2026-09-14T09:00:00', { mode: 'week', ...segments[2], label: segments[2].label }), true);
assert.equal(matchesDateRange('2026-09-21T00:00:00', { mode: 'week', ...segments[2], label: segments[2].label }), false);

const day = dayRange(new Date(2026, 8, 16));
assert.equal(matchesDateRange('2026-09-16T23:59:59', day), true);
assert.equal(matchesDateRange('2026-09-15T23:59:59', day), false);
assert.equal(matchesDateRange('2026-09-17T00:00:00', day), false);

const hours = hoursRange(new Date(2026, 8, 16), '09:00', '14:00');
assert.ok(hours);
assert.equal(matchesDateRange('2026-09-16T09:00:00', hours), true);
assert.equal(matchesDateRange('2026-09-16T10:30:00', hours), true);
assert.equal(matchesDateRange('2026-09-16T13:59:59', hours), true);
assert.equal(matchesDateRange('2026-09-16T08:59:59', hours), false);
assert.equal(matchesDateRange('2026-09-16T14:00:00', hours), false);
assert.equal(hoursRange(new Date(2026, 8, 16), '14:00', '09:00'), null);

assert.equal(matchesDateRange('not-a-date', month), false);
assert.equal(matchesDateRange(null, null), true);
assert.equal(matchesSearch('RPT-DR003', ['Monthly Operations', 'RPT-DR003-2026-000124']) && matchesDateRange('2026-09-16T12:00:00', day), true);

const formattedCreatedAt = formatDateTime(new Date(2026, 8, 16, 14, 34));
assert.match(formattedCreatedAt, /2026/);
assert.match(formattedCreatedAt, /2:34|14:34/);
assert.equal(formattedCreatedAt.includes('T'), false);

console.log('date search filter runtime test passed');
