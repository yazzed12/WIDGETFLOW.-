import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const app = read('src/context/AppContext.tsx');
const page = read('src/pages/TemplatesPage.tsx');
const migration = read('supabase/migrations/025_template_browser_read_grants.sql');
const helper = read('src/shared/businessRevisionLabel.ts');
const checks = [
  ['categories load independently and templates load after authority verification', app.includes('useEffect(() => { void refreshCategories(); }, []);') && app.includes('refreshTemplates(true, workspaceRequest)')],
  ['template loading error state', app.includes('templatesError') && app.includes('templatesLoading')],
  ['page retry state', page.includes('Unable to load report templates.') && page.includes('Retry')],
  ['category fallback cards', page.includes('categories.length === 0') && page.includes('<TemplateCard')],
  ['category-name search', page.includes("categories.find((cat) => cat.id === t.categoryId)")],
  ['tag search', page.includes('...t.tags') && page.includes('t.tags.includes(selectedTag)')],
  ['category counts aggregate templates', read('src/context/AppContext.tsx').includes("t.categoryId === catId && t.status === 'Approved'")],
  ['v1.0 hides suffix', helper.includes("revision > 0 ? `v${revision}` : ''")],
  ['025 authenticated select', migration.includes('grant select on table') && migration.includes('to authenticated')],
  ['025 anon revoked', migration.includes('from anon')],
  ['025 authenticated writes revoked', migration.includes('revoke insert, update, delete')],
  ['025 ledger', migration.includes("025_template_browser_read_grants")],
  ['no template api calls', !app.match(/apiService\.(getTemplates|getTemplateById|getPendingApprovals|saveTemplateDraft|submitTemplate|claimTemplateReview|approveTemplate|rejectTemplate|getTemplateComments|addTemplateComment|createTemplateVersion)/)],
];
let failed = 0; for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
if (failed) process.exit(1); console.log(`Phase 3D.1 static check passed (${checks.length} checks)`);
