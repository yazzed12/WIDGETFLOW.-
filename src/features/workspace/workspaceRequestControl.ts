import type { AuthStatus } from '../auth/authTypes.js';

export function isAuthenticatedSessionReady(
  status: AuthStatus,
  sessionUserId: string | null | undefined,
  principalUserId: string | null | undefined,
): boolean {
  return status === 'authenticated'
    && Boolean(sessionUserId)
    && sessionUserId === principalUserId;
}

export function runSingleFlight<T>(
  flights: Map<string, Promise<T>>,
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const active = flights.get(key);
  if (active) return active;

  let flight: Promise<T>;
  flight = Promise.resolve()
    .then(operation)
    .finally(() => {
      if (flights.get(key) === flight) flights.delete(key);
    });
  flights.set(key, flight);
  return flight;
}

/** Prevents overlapping authority mutations; a second click is ignored until the first settles. */
export async function runExclusiveAction<T>(
  lock: { current: boolean },
  operation: () => Promise<T>,
  busyResult: T,
): Promise<T> {
  if (lock.current) return busyResult;
  lock.current = true;
  try {
    return await operation();
  } finally {
    lock.current = false;
  }
}

/** Only transport/session authentication failures qualify for the one retry. */
export function isAuthenticationFailure(error: unknown): boolean {
  const candidate = error as {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
    message?: unknown;
    context?: { status?: unknown };
  } | null;
  const status = Number(candidate?.status ?? candidate?.statusCode ?? candidate?.context?.status);
  if (status === 401) return true;
  const code = String(candidate?.code ?? '').trim().toUpperCase();
  if (['PGRST301', 'JWT_EXPIRED', 'INVALID_JWT', 'AUTH_SESSION_MISSING'].includes(code)) return true;
  const message = typeof candidate?.message === 'string' ? candidate.message : '';
  return /\b(jwt expired|invalid jwt|session (?:is )?missing|token expired)\b/i.test(message);
}

export function sameAuthenticatedActor(
  expected: {
    id: string; name: string; email?: string; profileCode?: string; status?: string;
    roleId?: string | number; roleKey?: string; role?: string; roleType?: string;
    governanceLevel?: string; roleActive?: boolean; roleProtected?: boolean; permissions?: string[];
  },
  actual: {
    userId: string; fullName: string; email: string; profileCode: string; profileStatus: string;
    roleId: string; roleKey: string; roleName: string; roleType: string; governanceLevel: string;
    roleActive: boolean; roleProtected: boolean; effectivePermissions: string[];
  } | null,
): boolean {
  if (!actual) return false;
  const expectedPermissions = [...(expected.permissions ?? [])].sort();
  const actualPermissions = [...actual.effectivePermissions].sort();
  return expected.id === actual.userId
    && expected.name === actual.fullName
    && expected.email === actual.email
    && expected.profileCode === actual.profileCode
    && expected.status === actual.profileStatus
    && String(expected.roleId ?? '') === actual.roleId
    && expected.roleKey === actual.roleKey
    && expected.role === actual.roleName
    && expected.roleType === actual.roleType
    && expected.governanceLevel === actual.governanceLevel
    && expected.roleActive === actual.roleActive
    && expected.roleProtected === actual.roleProtected
    && expectedPermissions.length === actualPermissions.length
    && expectedPermissions.every((permission, index) => permission === actualPermissions[index]);
}

/** Coalesces one session-recovery attempt and permits at most one retry per session key. */
export class SingleAuthRecovery {
  private readonly recoveries = new Map<string, Promise<boolean>>();

  async run<T>(options: {
    key: string;
    operation: () => Promise<T>;
    isAuthenticationFailure: (error: unknown) => boolean;
    recover: () => Promise<boolean>;
    isCurrent?: () => boolean;
    onRetry?: () => void;
  }): Promise<T> {
    if (options.isCurrent && !options.isCurrent()) {
      const invalidated = new Error('Authenticated session changed.') as Error & { code: string };
      invalidated.code = 'AUTH_SESSION_MISSING';
      throw invalidated;
    }
    try {
      return await options.operation();
    } catch (error) {
      if (!options.isAuthenticationFailure(error)) throw error;
      if (options.isCurrent && !options.isCurrent()) throw error;

      let recovery = this.recoveries.get(options.key);
      if (!recovery) {
        recovery = Promise.resolve().then(options.recover);
        this.recoveries.set(options.key, recovery);
        const clearRecovery = () => {
          if (this.recoveries.get(options.key) === recovery) this.recoveries.delete(options.key);
        };
        // Avoid creating an unobserved rejected promise from Promise.finally.
        void recovery.then(clearRecovery, clearRecovery);
      }

      if (!await recovery || (options.isCurrent && !options.isCurrent())) throw error;
      // Deliberately do not recurse: an operation gets one retry, never a loop.
      options.onRetry?.();
      return options.operation();
    }
  }

  clear(): void {
    this.recoveries.clear();
  }
}

export function authorityContextIdentity(context: {
  actor: { userId: string; roleId?: string; roleName?: string };
  mode: string;
  delegation?: { delegationId: string; endAt?: string } | null;
  operationalSubject: { userId: string; roleId: string; roleKey?: string; roleName?: string; governanceLevel?: string | null };
  authority: { roleId: string; roleKey?: string; roleName?: string; effectivePermissions?: string[] };
  staleSelection: boolean;
}): string {
  return JSON.stringify([
    context.actor.userId,
    context.actor.roleId ?? null,
    context.actor.roleName ?? null,
    context.mode,
    context.delegation?.delegationId ?? null,
    context.delegation?.endAt ?? null,
    context.operationalSubject.userId,
    context.operationalSubject.roleId,
    context.operationalSubject.roleKey ?? null,
    context.operationalSubject.roleName ?? null,
    context.operationalSubject.governanceLevel ?? null,
    context.authority.roleId,
    context.authority.roleKey ?? null,
    context.authority.roleName ?? null,
    [...(context.authority.effectivePermissions ?? [])].sort(),
    context.staleSelection,
  ]);
}
