export type DelegationStatus = 'scheduled' | 'active' | 'expired' | 'cancelled';
export type DelegationDirection = 'created' | 'received' | 'all';
export type DelegationScope = 'active' | 'scheduled' | 'history' | 'all';

export interface DelegationCandidate {
  userId: string;
  fullName: string;
  profileCode: string | null;
  roleName: string;
  email: string | null;
}

export interface DelegationRecord {
  id: string;
  delegatorUserId: string;
  delegatorName: string;
  delegatorRoleName: string;
  delegateUserId: string;
  delegateName: string;
  delegateProfileCode: string | null;
  delegateRoleName: string;
  authorityRoleId: string;
  authorityRoleKey: string;
  authorityRoleName: string;
  startAt: string;
  endAt: string;
  status: DelegationStatus;
  reason?: string | null;
  cancelledAt?: string | null;
}

export interface DelegationPage<T> {
  rows: T[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface AuthorityPerson {
  userId: string;
  fullName: string;
  roleId: string;
  roleName: string;
}

export interface AuthorityDelegation {
  delegationId: string;
  delegatedByUserId: string;
  delegatedByName: string;
  startAt: string;
  endAt: string;
}

export interface AuthorityRole {
  roleId: string;
  roleKey: string;
  roleName: string;
  governanceLevel: string | null;
  /** Optional server-provided effective keys; never derived from role labels. */
  effectivePermissions?: string[];
}

/** Server-authorized identity whose read workspace is being presented. */
export interface OperationalSubject {
  userId: string;
  fullName: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  governanceLevel: string | null;
}

export interface AuthorityContext {
  mode: 'own' | 'delegated';
  actor: AuthorityPerson;
  operationalSubject: OperationalSubject;
  delegation: AuthorityDelegation | null;
  authority: AuthorityRole;
  staleSelection: boolean;
}

export type AuthorityContextStatus = 'loading' | 'ready' | 'error';

export class DelegationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'DelegationError';
  }
}
