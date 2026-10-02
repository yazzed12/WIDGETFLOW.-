import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { mapAuthorityContext, mapDelegationCandidate, mapDelegationRecord, mapPage } from './delegationMapper';
import { DelegationError } from './delegationTypes';
import { supabaseRequestError } from '../../lib/errors/supabaseRequestError';
import { isAuthenticationFailure } from '../workspace/workspaceRequestControl';
import type { AuthorityContext, DelegationCandidate, DelegationDirection, DelegationPage, DelegationRecord, DelegationScope } from './delegationTypes';

const PAGE_SIZE = 25;

function safeError(error: { code?: unknown; message?: unknown; details?: unknown; hint?: unknown }, status?: number): Error {
  if (isAuthenticationFailure({ ...error, status })) return supabaseRequestError(error, status, 'Your session has expired. Please sign in again.');
  const messages: Record<string, string> = {
    SELF_DELEGATION_NOT_ALLOWED: "You can't delegate authority to yourself.",
    DELEGATION_PERIOD_OVERLAP: 'You already have a delegation during this period.',
    PROTECTED_ADMIN_DELEGATION_FORBIDDEN: "Protected Admin authority can't be delegated.",
    DELEGATE_INACTIVE: 'This user is no longer available for delegation.',
    INVALID_DELEGATION_TIME: 'Choose a valid delegation period.',
    DELEGATION_NOT_ACTIVE_OR_NOT_ASSIGNED: 'This delegation is no longer available.',
    DELEGATION_CONTEXT_INVALID: 'Your delegated authority is no longer active.',
    DELEGATION_CANCEL_FORBIDDEN: "You can't cancel this delegation.",
    DELEGATION_ALREADY_EXPIRED: 'This delegation has already ended.',
    FORBIDDEN: "You don't have permission to perform this delegation action.",
  };
  const diagnosticText = [error.code, error.message, error.details, error.hint]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .toUpperCase();
  const knownCode = Object.keys(messages).find((candidate) => diagnosticText.includes(candidate));
  const code = knownCode ?? String(error.code ?? 'DELEGATION_REQUEST_FAILED').toUpperCase().split(/[:\s]/, 1)[0];
  return new DelegationError(code, messages[code] ?? 'We could not complete that delegation action. Please try again.');
}

async function rpc<T>(name: string, args: Record<string, unknown> = {}, transform: (data: unknown) => T): Promise<T> {
  const { data, error, status } = await getSupabaseBrowserClient().rpc(name, args);
  if (error) throw safeError(error, status);
  return transform(data);
}

export const delegationRepository = {
  listCandidates(search: string, limit = PAGE_SIZE, offset = 0): Promise<DelegationPage<DelegationCandidate>> {
    return rpc('list_delegation_candidates', { p_search: search.trim() || null, p_limit: limit, p_offset: offset }, (data) => mapPage(data, mapDelegationCandidate, limit, offset));
  },
  listMine(direction: DelegationDirection, scope: DelegationScope, limit = PAGE_SIZE, offset = 0): Promise<DelegationPage<DelegationRecord>> {
    return rpc('list_my_delegations', { p_direction: direction, p_scope: scope, p_limit: limit, p_offset: offset }, (data) => mapPage(data, mapDelegationRecord, limit, offset));
  },
  listOrganization(scope: DelegationScope, search: string, limit = PAGE_SIZE, offset = 0): Promise<DelegationPage<DelegationRecord>> {
    return rpc('list_organization_delegations', { p_scope: scope, p_search: search.trim() || null, p_limit: limit, p_offset: offset }, (data) => mapPage(data, mapDelegationRecord, limit, offset));
  },
  listAdmin(scope: DelegationScope, search: string, limit = PAGE_SIZE, offset = 0): Promise<DelegationPage<DelegationRecord>> {
    return rpc('admin_list_delegations', { p_scope: scope, p_search: search.trim() || null, p_limit: limit, p_offset: offset }, (data) => mapPage(data, mapDelegationRecord, limit, offset));
  },
  currentAuthorityContext(): Promise<AuthorityContext> {
    return rpc('current_authority_context', {}, (data) => mapAuthorityContext(data));
  },
  async create(delegateUserId: string, startAt: string, endAt: string, reason: string): Promise<void> {
    await rpc('create_delegation', { p_delegate_user_id: delegateUserId, p_start_at: startAt, p_end_at: endAt, p_reason: reason.trim() }, () => undefined);
  },
  async cancel(delegationId: string, reason: string): Promise<void> {
    await rpc('cancel_delegation', { p_delegation_id: delegationId, p_reason: reason.trim() }, () => undefined);
  },
  selectContext(delegationId: string): Promise<AuthorityContext> {
    return rpc('select_delegation_context', { p_delegation_id: delegationId }, (data) => mapAuthorityContext(data));
  },
  clearContext(): Promise<AuthorityContext> {
    return rpc('clear_delegation_context', {}, (data) => mapAuthorityContext(data));
  },
  async adminCancel(delegationId: string, reason: string): Promise<void> {
    await rpc('admin_cancel_delegation', { p_delegation_id: delegationId, p_reason: reason.trim() }, () => undefined);
  },
};

export { PAGE_SIZE as DELEGATION_PAGE_SIZE };
