import assert from 'node:assert/strict';
import { mapTemplateControlStates } from '../../src/features/insights/templateInsightsMapper';
import { canAccessInsights } from '../../src/features/insights/templateInsightsAccess';
import { deserializeTemplateRow } from '../../src/features/templates/mappers/templateSerializer';

const states = mapTemplateControlStates([
  { template_id: 'e59ca9e2-4568-4bf4-a5b4-e5bde6ed33b5', status: 'approved', is_paused: true, paused_at: '2026-09-24T10:00:00Z', pause_reason: 'Maintenance' },
  { templateId: '5b8e0060-2d03-4e7a-9dae-b87af68a3e53', status: 'approved', isPaused: false, pausedAt: null, pauseReason: null },
]);
assert.equal(states.length, 2);
assert.deepEqual(states[0], {
  templateId: 'e59ca9e2-4568-4bf4-a5b4-e5bde6ed33b5',
  status: 'approved',
  isPaused: true,
  pausedAt: '2026-09-24T10:00:00Z',
  pauseReason: 'Maintenance',
});
assert.equal(states[1].isPaused, false);

assert.equal(canAccessInsights({ status: 'ready', enabled: true, insightsAllowed: true, protectedAdmin: false }), true);
assert.equal(canAccessInsights({ status: 'loading', enabled: true, insightsAllowed: true, protectedAdmin: false }), false, 'Insights remains closed until actor-owned access is resolved');
assert.equal(canAccessInsights({ status: 'ready', enabled: true, insightsAllowed: false, protectedAdmin: false }), false, 'canonical actor-owned Insights denial remains authoritative');

const template = deserializeTemplateRow({
  id: 'e59ca9e2-4568-4bf4-a5b4-e5bde6ed33b5', status: 'approved', is_paused: true,
  name: 'Safety', category_id: 'category-id', created_by_user_id: 'profile-id', creator_name: 'Creator',
  creator_role_name: 'Employee', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-24T00:00:00Z',
}, [], [], []);
assert.equal(template.status, 'Approved', 'paused approved rows preserve Approved lifecycle status');
assert.equal(template.isPaused, true, 'the separate pause control state maps to the WidgetTemplate model');
console.log('Phase 098 Template control runtime tests passed.');
