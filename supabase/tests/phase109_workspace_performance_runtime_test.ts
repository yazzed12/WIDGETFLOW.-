import assert from 'node:assert/strict';
import {
  authorityContextIdentity,
  isAuthenticatedSessionReady,
  isAuthenticationFailure,
  runSingleFlight,
  sameAuthenticatedActor,
  SingleAuthRecovery,
} from '../../src/features/workspace/workspaceRequestControl.js';

assert.equal(isAuthenticatedSessionReady('authenticated', 'actor-1', 'actor-1'), true);
assert.equal(isAuthenticatedSessionReady('initializing', 'actor-1', 'actor-1'), false);
assert.equal(isAuthenticatedSessionReady('authenticated', null, 'actor-1'), false);
assert.equal(isAuthenticatedSessionReady('authenticated', 'actor-1', 'actor-2'), false);

const flights = new Map<string, Promise<number>>();
let calls = 0;
const first = runSingleFlight(flights, 'same-context', async () => { calls += 1; await Promise.resolve(); return 42; });
const second = runSingleFlight(flights, 'same-context', async () => { calls += 1; return 0; });
assert.equal(first, second, 'concurrent identical requests share the in-flight promise');
assert.deepEqual(await Promise.all([first, second]), [42, 42]);
assert.equal(calls, 1);
assert.equal(flights.size, 0, 'settled flights are removed so a later deliberate refresh can run');

const detailFlights = new Map<string, Promise<number>>();
let detailReads = 0;
const detailKey = (session: number, workspace: number, reportId: string) => `${session}:${workspace}:${reportId}`;
const loadDetail = (key: string) => runSingleFlight(detailFlights, key, async () => ++detailReads);
const sameDetail = await Promise.all([
  loadDetail(detailKey(1, 1, 'report-a')),
  loadDetail(detailKey(1, 1, 'report-a')),
]);
assert.deepEqual(sameDetail, [1, 1], 'same-session/workspace report detail coalesces');
assert.equal(await loadDetail(detailKey(1, 2, 'report-a')), 2, 'workspace change cannot reuse old detail flight');
assert.equal(await loadDetail(detailKey(2, 2, 'report-a')), 3, 'session change cannot reuse old detail flight');

const recovery = new SingleAuthRecovery();
let recoverCalls = 0;
const authenticationError = Object.assign(new Error('JWT expired'), { status: 401 });

// Use independent, stateful operations to demonstrate concurrent failures
// share one session recovery, then each perform exactly one retry.
const makeOperation = () => {
  let attempts = 0;
  return async () => {
    attempts += 1;
    if (attempts === 1) throw authenticationError;
    return true;
  };
};
const [recoveredOne, recoveredTwo] = await Promise.all([
  recovery.run({ key: 'actor-1:session-1', operation: makeOperation(), isAuthenticationFailure, recover: async () => { recoverCalls += 1; await Promise.resolve(); return true; } }),
  recovery.run({ key: 'actor-1:session-1', operation: makeOperation(), isAuthenticationFailure, recover: async () => { recoverCalls += 1; await Promise.resolve(); return true; } }),
]);
assert.equal(recoveredOne, true);
assert.equal(recoveredTwo, true);
assert.equal(recoverCalls, 1, 'concurrent 401s coalesce the principal/session recovery');

let boundedAttempts = 0;
await assert.rejects(() => recovery.run({
  key: 'actor-1:session-2',
  operation: async () => { boundedAttempts += 1; throw authenticationError; },
  isAuthenticationFailure,
  recover: async () => true,
}), /JWT expired/);
assert.equal(boundedAttempts, 2, 'a request is retried once and never loops');

let laterRecoveryCalls = 0;
await recovery.run({
  key: 'actor-1:session-1',
  operation: makeOperation(),
  isAuthenticationFailure,
  recover: async () => { laterRecoveryCalls += 1; return true; },
});
assert.equal(laterRecoveryCalls, 1, 'a later independent auth failure may recover again');

async function verifyInvalidatedRecovery(reason: string) {
  const guardedRecovery = new SingleAuthRecovery();
  let current = true;
  let attempts = 0;
  let resolveRecovery!: (value: boolean) => void;
  let recoveryStarted!: () => void;
  const started = new Promise<void>((resolve) => { recoveryStarted = resolve; });
  const gate = new Promise<boolean>((resolve) => { resolveRecovery = resolve; });
  const request = guardedRecovery.run({
    key: `old-session:${reason}`,
    operation: async () => { attempts += 1; throw authenticationError; },
    isAuthenticationFailure,
    recover: () => { recoveryStarted(); return gate; },
    isCurrent: () => current,
  });
  await started;
  current = false; // Logout or User A -> User B changes the captured session boundary.
  resolveRecovery(true);
  await assert.rejects(request, /JWT expired/);
  assert.equal(attempts, 1, `${reason}: no old operation is retried after invalidation`);
}
await verifyInvalidatedRecovery('logout');
await verifyInvalidatedRecovery('account-replacement');

let validAttempts = 0;
await new SingleAuthRecovery().run({
  key: 'same-session',
  operation: async () => { validAttempts += 1; if (validAttempts === 1) throw authenticationError; return true; },
  isAuthenticationFailure,
  recover: async () => true,
  isCurrent: () => true,
});
assert.equal(validAttempts, 2, 'unchanged session retries exactly once');

assert.equal(isAuthenticationFailure({ status: 401, message: 'unauthorized' }), true);
assert.equal(isAuthenticationFailure({ code: 'PGRST301' }), true);
assert.equal(isAuthenticationFailure({ status: 403, code: 'FORBIDDEN' }), false);
assert.equal(isAuthenticationFailure({ status: 42501, code: '42501' }), false);

const expectedActor = {
  id: 'actor-1', name: 'Example User', email: 'example@example.test', profileCode: 'EMP-001', status: 'Active',
  roleId: 'role-1', roleKey: 'employee', role: 'Employee', roleType: 'Operational', governanceLevel: 'L1',
  roleActive: true, roleProtected: false, permissions: ['reports.view_own', 'reports.create'],
};
const currentPrincipal = {
  userId: 'actor-1', fullName: 'Example User', email: 'example@example.test', profileCode: 'EMP-001', profileStatus: 'Active',
  roleId: 'role-1', roleKey: 'employee', roleName: 'Employee', roleType: 'Operational', governanceLevel: 'L1',
  roleActive: true, roleProtected: false, effectivePermissions: ['reports.create', 'reports.view_own'],
};
assert.equal(sameAuthenticatedActor(expectedActor, currentPrincipal), true);
assert.equal(sameAuthenticatedActor(expectedActor, { ...currentPrincipal, effectivePermissions: [] }), false);
assert.equal(sameAuthenticatedActor(expectedActor, null), false);

const authority = {
  actor: { userId: 'actor-1', roleId: 'role-1', roleName: 'Employee' },
  mode: 'own',
  delegation: null,
  operationalSubject: { userId: 'actor-1', roleId: 'role-1', roleKey: 'employee', roleName: 'Employee', governanceLevel: 'L1' },
  authority: { roleId: 'role-1', roleKey: 'employee', roleName: 'Employee', effectivePermissions: ['reports.create'] },
  staleSelection: false,
};
assert.equal(authorityContextIdentity(authority), authorityContextIdentity({ ...authority, authority: { ...authority.authority, effectivePermissions: ['reports.create'] } }));
assert.notEqual(authorityContextIdentity(authority), authorityContextIdentity({ ...authority, mode: 'delegated' }));
assert.notEqual(authorityContextIdentity(authority), authorityContextIdentity({ ...authority, operationalSubject: { ...authority.operationalSubject, roleKey: 'manager' } }));

console.log('Phase 109 workspace performance runtime checks passed');
