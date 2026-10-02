import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const page = read('src/pages/InsightsPage.tsx');
const repository = read('src/features/insights/templateInsightsRepository.ts');
const mapper = read('src/features/insights/templateInsightsMapper.ts');
const chart = read('src/features/insights/components/TemplateUsageTrendChart.tsx');
const trend = read('src/features/insights/templateInsightsTrend.ts');

assert.match(repository, /get_template_usage_period_summary/);
for (const parameter of ['p_start_at: options.startAt', 'p_end_at: options.endAt', 'p_category_id: options.categoryId']) assert.ok(repository.includes(parameter), `period summary receives ${parameter}`);
assert.match(mapper, /mapTemplateUsagePeriodSummary/);
for (const value of ['templatesApproved', 'activeTemplates', 'templatesWithNoActivity', 'reportsCreated', 'uniqueUsers', 'reportsPerActiveTemplate']) {
  assert.ok(page.includes(`periodSummary.${value}`), `${value} KPI is sourced from Migration 095 response`);
}
assert.match(page, /periodSummaryKey = `\$\{range\.startAt\}:\$\{range\.endAt\}:\$\{categoryId/);
assert.match(page, /\[allowed, range\.startAt, range\.endAt, categoryId, periodSummaryKey\]/, 'summary request depends only on permission, period, category, and retry key');
assert.doesNotMatch(page.match(/const periodSummaryKey = `[\s\S]*?const selectedTemplateId/)?.[0] ?? '', /search|usageState/, 'search and usage do not affect period summary key');
assert.match(page, /No Report activity in selected period/);
assert.doesNotMatch(page.match(/aria-label="Selected-period Template usage summary"[\s\S]*?<\/section>/)?.[0] ?? '', /Never Used|Lifetime/, 'top KPIs do not use lifetime or Never Used labels');
assert.match(page, /Approved Templates Never Used[\s\S]*lifetime measure/, 'the table-side Never Used concept remains explicitly lifetime-based');

assert.match(page, /getTemplateUsageInsights\(requestOptions\)/, 'main trend continues to originate from the main insights RPC');
assert.match(page, /<TemplateUsageTrendChart[\s\S]*points=\{result\.trend\}/, 'main chart consumes the RPC trend points');
assert.match(chart, /onMouseEnter=\{\(\) => setActiveIndex\(index\)\}/);
assert.match(chart, /onFocus=\{\(\) => setActiveIndex\(index\)\}/, 'chart points are keyboard-interactive');
assert.match(chart, /aria-label=\{`\$\{point\.tooltipLabel\}\. Reports Created: \$\{point\.reportsCreated\}`\}/);
assert.match(chart, /Reports Created: <span/, 'tooltip includes the exact Reports Created value');
assert.match(chart, /No Template Reports were created during this period\./);
assert.match(chart, /activeIndex === index/, 'active point is visually highlighted');
assert.match(trend, /supplied\.get\(bucket\.getTime\(\)\) \?\? 0/, 'missing buckets are zero filled');
assert.match(trend, /normalized\.push\(/);
assert.match(trend, /reportsCreated: supplied\.get\(bucket\.getTime\(\)\) \?\? 0/, 'counts are copied from RPC or use zero only for missing buckets');
assert.match(trend, /sort|for \(let bucket = new Date\(first\); bucket < end;/, 'buckets are generated in chronological order');
assert.match(trend, /tooltipLabel: `Week of/);
assert.match(trend, /year: 'numeric'/, 'tooltip labels format bucket dates without ISO strings');
assert.doesNotMatch(page + repository + mapper, /\.from\(['"]reports['"]\)|reports\.filter\(/, 'no browser-side Report aggregation');
console.log('Phase 4C period summary and chart static checks passed.');
