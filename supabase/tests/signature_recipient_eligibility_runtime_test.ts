import assert from 'node:assert/strict';
import {
  normalizeRecipientDirectoryRow,
  normalizeRoleKey,
  resolveCanonicalRecipientRoleKey,
} from '../../src/features/reports/reportService';

const selected = [
  normalizeRecipientDirectoryRow({ user_id: 'employee-1', full_name: 'Gamal Elsayed', role_key: 'employee', role_name: 'Employee' }),
  normalizeRecipientDirectoryRow({ user_id: 'manager-1', full_name: 'Hazzem Emmam', role_key: 'manager', role_name: 'Manager' }),
];

assert.equal(selected[1].roleKey, 'manager');
assert.equal(selected[1].roleName, 'Manager');
assert.equal(resolveCanonicalRecipientRoleKey('Manager', selected), 'manager');
assert.equal(resolveCanonicalRecipientRoleKey('manager', selected), 'manager');
assert.equal(resolveCanonicalRecipientRoleKey('Director', selected), 'director');

const managerEligible = selected.filter((recipient) => normalizeRoleKey(recipient.roleKey) === resolveCanonicalRecipientRoleKey('Manager', selected));
assert.deepEqual(managerEligible.map((recipient) => recipient.fullName), ['Hazzem Emmam']);

const directorEligible = selected.filter((recipient) => normalizeRoleKey(recipient.roleKey) === resolveCanonicalRecipientRoleKey('Director', selected));
assert.equal(directorEligible.length, 0);

const twoManagers = [
  ...selected,
  normalizeRecipientDirectoryRow({ id: 'manager-2', name: 'Manager C', roleKey: 'manager', roleName: 'Manager' }),
];
assert.equal(twoManagers.filter((recipient) => normalizeRoleKey(recipient.roleKey) === resolveCanonicalRecipientRoleKey('Manager', twoManagers)).length, 2);

const employeeOnly = selected.filter((recipient) => normalizeRoleKey(recipient.roleKey) === resolveCanonicalRecipientRoleKey('Employee', selected));
assert.deepEqual(employeeOnly.map((recipient) => recipient.fullName), ['Gamal Elsayed']);

console.log('signature_recipient_eligibility_runtime_test: PASS');
