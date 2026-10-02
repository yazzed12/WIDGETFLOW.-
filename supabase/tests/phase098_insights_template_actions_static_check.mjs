import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const insights = read('src/pages/InsightsPage.tsx');
const actions = read('src/components/insights/TemplateUsageActions.tsx');
const action = read('src/components/templates/DeleteTemplateAction.tsx');
const access = read('src/features/insights/templateInsightsAccess.ts');
const repository = read('src/features/insights/templateInsightsRepository.ts');
const templateRepository = read('src/features/templates/repositories/templateRepository.ts');
const service = read('src/features/insights/templateInsightsService.ts');
const context = read('src/context/AppContext.tsx');
const myRequests = read('src/pages/MyRequestsPage.tsx');
const app = read('src/App.tsx');
const sidebar = read('src/components/layout/Sidebar.tsx');
const templatePage = read('src/pages/TemplatesPage.tsx');
const card = read('src/components/templates/TemplateCard.tsx');
const detail = read('src/components/templates/TemplateDetailModal.tsx');
const requestDrawer = read('src/components/requests/RequestDetailDrawer.tsx');
const approvalDrawer = read('src/components/approvals/ApprovalDetailDrawer.tsx');
const serializer = read('src/features/templates/mappers/templateSerializer.ts');

const checks = [
  ['Usage table has dedicated Action column and reusable action menu', /<th[^>]*>Action<\/th>/.test(insights) && insights.includes('<TemplateUsageActions')],
  ['control states load once for current visible Template UUIDs', insights.includes('getTemplateControlStates(visibleTemplateIds)') && insights.includes('new Map(states.map((state) => [state.templateId, state]))')],
  ['control-state requests are race-safe', /let current = true;[\s\S]*getTemplateControlStates[\s\S]*if \(current\)[\s\S]*return \(\) => \{ current = false; \}/.test(insights)],
  ['all control actions use centralized effective Insights access', access.includes("access.status === 'ready' && access.insightsAllowed") && app.includes('canAccessInsights(insightsAccess)') && sidebar.includes('canAccessInsights(insightsAccess)') && action.includes('canAccessInsights(insightsAccess)')],
  ['no frontend action gate relies on archive_any', !/templates\.archive_any/.test(context + app + sidebar + myRequests + insights + actions + action + card + templatePage + detail + requestDrawer + approvalDrawer)],
  ['My Requests no longer exposes separate template management', !/Manage Templates|ArchiveTemplateManagement/.test(myRequests) && !/ArchiveTemplateManagement/.test(context)],
  ['obsolete list-for-management RPC client removed', !/list_templates_for_archive_management|listForArchiveManagement|archiveManagementTypes/.test(repository + service)],
  ['pause, resume, revision, and delete use existing RPC contracts', repository.includes("pause_template_from_insights") && repository.includes("resume_template_from_insights") && repository.includes("create_template_revision_from_insights") && repository.includes('templateRepository.archiveAny(templateId, reason)') && templateRepository.includes("rpc('archive_template_any'")],
  ['RPC arguments use exact Template UUID and trimmed optional reason', /p_template_id: templateId/.test(repository) && /p_reason: reason\.trim\(\) \|\| null/.test(repository)],
  ['actions expose Edit, Pause/Resume, Delete and keyboard/outside dismissal', actions.includes('Edit Template') && actions.includes('Pause Template') && actions.includes('Resume Template') && actions.includes('Delete Template') && actions.includes("event.key === 'Escape'") && actions.includes('pointerdown') && actions.includes('createPortal')],
  ['pause modal labels and caps reason at 500 characters', actions.includes('Pause Template?') && actions.includes('maxLength={500}') && actions.includes('Version {template.currentVersion')],
  ['approved row usage/status remain distinct from pause indicator', insights.includes('Current Status') && insights.includes('Usage') && insights.includes('control?.isPaused')],
  ['delete confirmation retains report/version/usage/audit preservation explanation', action.includes('Existing Reports, Template versions, usage history, and audit history will be preserved.') && action.includes('maxLength={500}')],
  ['revision RPC result is reloaded through canonical template mapper', repository.includes("templateRepository.getTemplateById(createdId)")],
  ['new revision opens in the existing Studio under canonical Insights access', actions.includes('openAddTemplateModal(draft)') && /canOpenDraftRevision = Boolean\(draftToEdit\?\.id\) && canAccessInsights\(insightsAccess\)/.test(app) && app.includes('<TemplateBuilder')],
  ['pause state comes from canonical is_paused row mapping', serializer.includes('isPaused: row.is_paused === true')],
  ['new Report creation is blocked for paused Templates but editing an existing Report is allowed', /template\.isPaused && !reportInstanceToEdit/.test(context)],
  ['normal Template Library indicates paused state and disables Use Template', templatePage.includes('tpl.isPaused') && card.includes('disabled={template.isPaused}') && detail.includes('disabled={template.isPaused}')],
  ['action button stops propagation and delete action removed from other detail surfaces', insights.includes('onClick={(event) => event.stopPropagation()}') && insights.includes('<TemplateUsageActions') && !/DeleteTemplateAction/.test(detail + requestDrawer + approvalDrawer)],
  ['archive path remains soft archive and has no direct browser delete', !/\.from\(['"]templates['"]\)\s*\.delete\s*\(/.test(repository + service + context + action)],
  ['archive refreshes active Templates and increments Insights refresh revision', context.includes('await refreshTemplates()') && context.includes('setTemplateArchiveRevision((revision) => revision + 1)')],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log('Phase 098 Insights Template Actions static checks passed.');
