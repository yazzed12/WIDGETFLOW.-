import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const sidebar = read('src/components/layout/Sidebar.tsx');
const css = read('src/index.css');
const insights = read('src/pages/InsightsPage.tsx');
const chart = read('src/features/insights/components/TemplateUsageTrendChart.tsx');
const admin = read('src/components/admin/AdminLayout.tsx');

const checks = [
  ['application shell owns a dynamic viewport with clipped outer frame', app.includes('h-dvh min-h-0') && app.includes('overflow-hidden')],
  ['single explicit main vertical scroll owner has min-height and overscroll containment', app.includes('<main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain')],
  ['nested shell flex children can shrink to the viewport', (app.match(/min-h-0/g) ?? []).length >= 3],
  ['sidebar remains full height and its own long navigation can scroll', sidebar.includes('h-full min-h-0') && sidebar.includes('min-h-0 flex-1 overflow-y-auto')],
  ['Insights does not stack viewport-height sizing', !/h-screen|min-h-screen|100vh|100dvh/.test(insights)],
  ['closed Insights detail drawer is fixed overlay, not document height', insights.includes('fixed inset-0') && insights.includes('role="dialog"')],
  ['chart height is intrinsic to finite SVG viewBox', chart.includes('viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}') && chart.includes('className="block h-auto w-full overflow-visible"') && !/min-h-screen|h-screen|100vh/.test(chart)],
  ['global CSS does not mask page scrolling', !/body\s*\{[^}]*overflow\s*:\s*hidden/s.test(css)],
  ['separate Admin shell remains unchanged and owns its own scroll region', admin.includes('h-screen w-screen overflow-hidden') && admin.includes('main className="flex-1 overflow-y-auto')],
];

let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed += 1;
}
if (failed) process.exitCode = 1;
