import assert from 'node:assert/strict';
import {
  canWriteReportAttachment,
  hasReportAttachmentPermission,
} from '../functions/_shared/reportAttachmentAuthorization.ts';

const userId = '22222222-2222-4222-8222-222222222222';
const principal = {
  userId,
  profileStatus: 'Active',
  roleActive: true,
  effectivePermissions: [
    'reports.create',
    'reports.edit_draft',
    'reports.view_own',
  ],
};

assert.equal(hasReportAttachmentPermission(principal), true);
assert.equal(canWriteReportAttachment(principal, {
  created_by_user_id: userId,
  status: 'draft',
  locked_at: null,
}), true, 'creator-owned unlocked Draft must pass');

assert.equal(canWriteReportAttachment(principal, {
  created_by_user_id: '33333333-3333-4333-8333-333333333333',
  status: 'draft',
  locked_at: null,
}), false, 'another user\'s report must be denied');

assert.equal(canWriteReportAttachment({
  ...principal,
  effectivePermissions: ['reports.view_own'],
}, {
  created_by_user_id: userId,
  status: 'draft',
  locked_at: null,
}), false, 'missing create/edit permission must be denied');

assert.equal(canWriteReportAttachment(principal, {
  created_by_user_id: userId,
  status: 'completed',
  locked_at: null,
}), false, 'non-Draft reports must be denied');

console.log('phase085 report link authorization runtime checks passed');
