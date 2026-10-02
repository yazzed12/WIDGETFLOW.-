import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// No browser, network, or writes. Render the real Dashboard/Sidebar/Card JSX,
// capture its actual button callbacks, and execute the real AppContext handlers.
// Only external data and the non-target page/modal contents are replaced.
const require = createRequire(import.meta.url);
const root = process.cwd();
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function declaration(file, name) {
  const tree = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let match;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) match = node.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(match, `${file} contains ${name}`);
  return `const ${match};`;
}

const contextDeclarations = [
  'hasOperationalPermission', 'canOpenOperationalReadView', 'navigateToView',
  'openFillReportModal', 'openAddTemplateModal', 'openTemplateDetail',
].map((name) => declaration('src/context/AppContext.tsx', name)).join('\n');
const mainContent = declaration('src/App.tsx', 'MainContent');
const globalModals = declaration('src/App.tsx', 'GlobalModals');
const placeholders = [
  'TemplatesPage', 'MyRequestsPage', 'ApprovalsPage', 'DelegationsPage', 'ReportsPage',
  'InsightsPage', 'NotificationsPage', 'OrganizationActivityPage', 'StickyNotesPage', 'EngineProofPage',
  'TemplateBuilder', 'TemplateDetailModal', 'RequestDetailDrawer', 'ApprovalDetailDrawer',
  'RequestChatDrawer', 'FillReportModal', 'ReportViewModal', 'SendReportModal',
  'ReturnReportModal', 'RejectReportModal', 'SignReportModal', 'ProfileModal',
].map((name) => `const ${name} = () => <div data-surface="${name}" />;`).join('\n');

const result = await build({
  stdin: {
    contents: `
      import React from 'react';
      import { useApp } from './src/context/AppContext';
      import { DashboardPage } from './src/pages/DashboardPage';
      import { Sidebar } from './src/components/layout/Sidebar';
      import { TemplateCard } from './src/components/templates/TemplateCard';
      import { delegationService } from './src/features/delegations/delegationService';
      import { canAuthorTemplate, canCreateTemplateBackedReport, hasEffectiveAuthorityPermission } from './src/features/delegations/effectiveAuthority';
      const canAccessInsights = () => false;
      ${placeholders}
      ${mainContent}
      ${globalModals}
      export { DashboardPage, Sidebar, TemplateCard, MainContent, GlobalModals, delegationService };
      export function bindContext(state) {
        const { currentUser, authorityContext, authorityContextStatus } = state;
        const setActiveView = (view) => { state.activeView = view; };
        const showToast = (message) => { state.warning = message; };
        const refreshInsightsAccess = async () => false;
        const notifyOperationalActionBlocked = () => showToast('Forbidden');
        const reportEditRequest = { current: 0 };
        const reportPersistenceRef = { current: { seed() {} } };
        const setReportEditLoadingId = () => {};
        const setReportToEdit = (value) => { state.reportToEdit = value; };
        const setSelectedTemplateForFill = (value) => { state.selectedTemplateForFill = value; };
        const setSelectedTemplateForDetail = (value) => { state.selectedTemplateForDetail = value; };
        const setDraftToEdit = (value) => { state.draftToEdit = value; };
        const setIsAddModalOpen = (value) => { state.isAddModalOpen = value; };
        ${contextDeclarations}
        return Object.assign(state, { hasOperationalPermission, canOpenOperationalReadView,
          hasTemplateApprovalPermission: hasOperationalPermission, setActiveView: navigateToView,
          openFillReportModal, openAddTemplateModal, openTemplateDetail });
      }
    `,
    resolveDir: root, loader: 'tsx',
  },
  bundle: true, platform: 'node', format: 'cjs', write: false, packages: 'external',
  external: [require.resolve('react')],
  jsx: 'transform', jsxFactory: 'React.createElement',
  tsconfigRaw: { compilerOptions: { jsx: 'react' } },
  define: { 'import.meta.env.DEV': 'true' },
  plugins: [{
    name: 'component-boundaries',
    setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react-capture', namespace: 'test' }));
      builder.onResolve({ filter: /context\/AppContext$/ }, () => ({ path: 'context', namespace: 'test' }));
      builder.onResolve({ filter: /context\/SystemConfigContext$/ }, () => ({ path: 'config', namespace: 'test' }));
      builder.onResolve({ filter: /dashboard\/WorkflowMonitor$/ }, () => ({ path: 'monitor', namespace: 'test' }));
      builder.onResolve({ filter: /lib\/supabase\/client$/ }, () => ({ path: 'rpc', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, ({ path: name }) => {
        const code = {
          'react-capture': `
            const real = require(${JSON.stringify(require.resolve('react'))});
            module.exports = { ...real, useEffect(effect, deps) {
              globalThis.__wfEffects.push(effect);
              return real.useEffect(effect, deps);
            }, createElement(type, props, ...children) {
              const element = real.createElement(type, props, ...children);
              if (type === 'button') globalThis.__wfButtons.push(element);
              return element;
            } };
          `,
          context: 'export const useApp = () => globalThis.__wfContext;',
          config: 'export const useSystemConfig = () => ({ isSettingEnabled: () => false });',
          monitor: 'export const WorkflowMonitor = () => null;',
          rpc: `export const getSupabaseBrowserClient = () => ({ rpc: async (name) => {
            globalThis.__wfRpcCalls.push(name);
            return { data: globalThis.__wfRpcPayload, error: null, status: 200 };
          } });`,
        };
        return { contents: code[name], loader: 'js' };
      });
    },
  }],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', 'React', result.outputFiles[0].text)(require, module, module.exports, React);
const { DashboardPage, Sidebar, TemplateCard, MainContent, GlobalModals, delegationService, bindContext } = module.exports;
const traces = [];
const originalInfo = console.info;
console.info = (...args) => { traces.push(args); };

// Synthetic, minimal permissions, NOT an assertion about Hassan's live role.
const permissions = ['reports.create', 'reports.view_own', 'templates.view_approved', 'templates.use', 'templates.create'];
const employeePermissions = ['reports.view_own', 'templates.view_approved'];
function payload(mode, keys) {
  const subject = mode === 'delegated' ? 'subject' : 'actor';
  return {
    mode,
    actor: { user_id: 'actor', full_name: 'Actor', role_id: 'employee', role_name: 'Employee' },
    operational_subject: { user_id: subject, full_name: 'Subject', role_id: 'custom-role', role_key: 'custom', role_name: 'Custom authority' },
    authority: { role_id: 'custom-role', role_key: 'custom', role_name: 'Custom authority', effective_permissions: keys },
    delegation: mode === 'delegated' ? { delegation_id: 'delegation', delegated_by_user_id: subject, delegated_by_name: 'Subject', start_at: '2026-10-01T00:00:00Z', end_at: '2026-10-14T00:00:00Z' } : null,
  };
}
const template = { id: 'template-id', name: 'DEMO TEMP', categoryId: 'cat-finance', status: 'Approved', tags: [], updatedAt: '2026-10-01T00:00:00Z' };
async function contextFor(mode, keys, actorKeys = employeePermissions) {
  globalThis.__wfRpcPayload = payload(mode, keys);
  globalThis.__wfRpcCalls = [];
  const context = await delegationService.currentAuthorityContext();
  assert.deepEqual(globalThis.__wfRpcCalls, ['current_authority_context']);
  assert.deepEqual(context.authority.effectivePermissions, keys);
  assert.equal(context.authority.roleId, 'custom-role');
  assert.equal(context.authority.roleName, 'Custom authority');
  return bindContext({
    authorityContext: context, authorityContextStatus: 'ready',
    currentUser: { id: 'actor', name: 'Actor', role: 'Employee', permissions: actorKeys },
    operationalSubject: context.operationalSubject, operationalSubjectUserId: context.operationalSubject.userId,
    isDelegatedMode: mode === 'delegated', activeView: 'dashboard', selectedCategory: 'old-category',
    insightsAccess: { status: 'ready', insightsAllowed: false },
    operationalWorkspaceLoading: false, sidebarOpen: true, reports: [], notifications: [], templates: [template],
    categories: [{ id: 'cat-finance', name: 'DEMO 1', iconName: 'Layers' }],
    getApprovedTemplates: () => [template], getMyRequestsForUser: () => [], getPendingApprovalsForUser: () => [],
    getReportsAwaitingMyReview: () => [], getCategoryTemplateCount: () => 1, getTotalCategoryCount: () => 1,
    hasPermission: (key) => actorKeys.includes(key),
    setSelectedCategory(value) { this.selectedCategory = value; },
  });
}
function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement(node)) return textOf(node.props.children);
  return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
}
function render(Component, context, props = {}) {
  globalThis.__wfContext = context;
  // Match React's setter semantics, not a method requiring a bound `this`.
  context.setSelectedCategory = (value) => { context.selectedCategory = value; };
  globalThis.__wfButtons = [];
  globalThis.__wfEffects = [];
  const markup = renderToStaticMarkup(React.createElement(Component, props));
  // SSR does not run effects. Explicitly exercise the captured diagnostics
  // callbacks; this is not a claim of a browser-mounted integration test.
  for (const effect of globalThis.__wfEffects) effect();
  return { markup, buttons: [...globalThis.__wfButtons] };
}
function click(rendered, label) {
  const button = rendered.buttons.find((entry) => textOf(entry.props.children).includes(label) || entry.props['aria-label'] === label);
  assert.ok(button, `actual rendered button: ${label}`);
  assert.ok(!button.props.disabled, `${label} is enabled`);
  button.props.onClick();
}

for (const mode of ['own', 'delegated']) {
  const context = await contextFor(mode, permissions, mode === 'own' ? permissions : employeePermissions);
  let rendered = render(MainContent, context);
  assert.match(rendered.markup, /Quick Actions/);
  assert.match(rendered.markup, /Create New Template/);
  assert.match(rendered.markup, /Create Report/);
  if (mode === 'delegated') {
    const trace = traces.findLast(([label]) => label === '[WidgetFlow delegated runtime]')?.[1];
    assert.deepEqual(trace.effectivePermissions, permissions);
    assert.equal(trace.canCreateReport, true);
    assert.equal(trace.canCreateTemplate, true);
    assert.equal(trace.canUseTemplate, true);
    assert.equal(trace.quickActionsMounted, true);
    assert.deepEqual(trace.quickActionIds, ['create-template', 'create-report', 'my-requests']);
    const mapping = traces.findLast(([label]) => label === '[WidgetFlow authority mapping]')?.[1];
    assert.equal(mapping.sources[0].path, 'authority.effective_permissions');
    assert.equal(mapping.mappedCount, permissions.length);
  }
  click(rendered, 'Browse Report Templates');
  assert.equal(context.activeView, 'templates');
  assert.equal(context.selectedCategory, null);
  assert.match(render(MainContent, context).markup, /data-surface="TemplatesPage"/, 'real route guard permits Templates');

  context.activeView = 'dashboard';
  click(render(DashboardPage, context), 'Create Report');
  assert.equal(context.activeView, 'templates');
  click(render(DashboardPage, context), 'Create New Template');
  assert.equal(context.isAddModalOpen, true);
  assert.match(render(GlobalModals, context).markup, /data-surface="TemplateBuilder"/);
  context.isAddModalOpen = false;

  click(render(Sidebar, context), 'DEMO TEMP');
  assert.equal(context.selectedTemplateForFill, template, 'sidebar passes the exact approved template to the real modal handler');
  assert.match(render(GlobalModals, context).markup, /data-surface="FillReportModal"/);
  context.selectedTemplateForFill = null;
  click(render(TemplateCard, context, { template }), 'Use DEMO TEMP to create a report');
  assert.equal(context.selectedTemplateForFill, template);
  context.selectedTemplateForFill = null;
  const paused = { ...template, isPaused: true };
  click(render(TemplateCard, context, { template: paused }), 'Preview DEMO TEMP');
  assert.equal(context.selectedTemplateForDetail, paused);
  assert.equal(context.selectedTemplateForFill, null);
}

for (const [permission, label] of [['reports.create', 'Create Report'], ['templates.create', 'Create New Template']]) {
  const context = await contextFor('delegated', [permission]);
  const rendered = render(MainContent, context);
  assert.ok(rendered.markup.includes(label), `${permission} alone renders its existing creation entry`);
}
const ownEmployee = await contextFor('own', employeePermissions);
let rendered = render(MainContent, ownEmployee);
assert.doesNotMatch(rendered.markup, /Create New Template|>Create Report</);
click(rendered, 'Browse Report Templates');
assert.match(render(MainContent, ownEmployee).markup, /data-surface="TemplatesPage"/);
click(render(Sidebar, ownEmployee), 'DEMO TEMP');
assert.equal(ownEmployee.selectedTemplateForDetail, template, 'view-only actor still previews');
assert.equal(ownEmployee.selectedTemplateForFill, undefined);

for (const keys of [undefined, []]) {
  const denied = await contextFor('delegated', keys, permissions);
  rendered = render(MainContent, denied);
  assert.doesNotMatch(rendered.markup, /Quick Actions|Create New Template|>Create Report</);
  click(rendered, 'Browse Report Templates');
  assert.equal(denied.activeView, 'dashboard');
  assert.match(denied.warning, /current authority doesn't have permission/);
  const row = render(Sidebar, denied).buttons.find((button) => textOf(button).includes('DEMO TEMP'));
  assert.equal(row.props.disabled, true, 'missing authority keys never fall back to actor privileges');
}

// Re-render against the newly read context, not an initial own-role snapshot.
const switched = await contextFor('delegated', permissions);
assert.match(render(MainContent, switched).markup, /Create New Template/);
const returned = await contextFor('own', employeePermissions);
assert.doesNotMatch(render(MainContent, returned).markup, /Create New Template/);
console.info = originalInfo;
console.log('PASS: real Dashboard/MainContent/Sidebar/TemplateCard callbacks, repository→mapper→service, AppContext handlers and modal gates (synthetic authority fixtures; no browser/live RPC).');
