import { delegationRepository, DELEGATION_PAGE_SIZE } from './delegationRepository';
import type { DelegationDirection, DelegationScope } from './delegationTypes';

export const delegationService = {
  listCandidates: (search: string, offset = 0) => delegationRepository.listCandidates(search, DELEGATION_PAGE_SIZE, offset),
  listMine: (direction: DelegationDirection, scope: DelegationScope, offset = 0) => delegationRepository.listMine(direction, scope, DELEGATION_PAGE_SIZE, offset),
  listOrganization: (scope: DelegationScope, search: string, offset = 0) => delegationRepository.listOrganization(scope, search, DELEGATION_PAGE_SIZE, offset),
  listAdmin: (scope: DelegationScope, search: string, offset = 0) => delegationRepository.listAdmin(scope, search, DELEGATION_PAGE_SIZE, offset),
  currentAuthorityContext: () => delegationRepository.currentAuthorityContext(),
  create: delegationRepository.create,
  cancel: delegationRepository.cancel,
  selectContext: delegationRepository.selectContext,
  clearContext: delegationRepository.clearContext,
  adminCancel: delegationRepository.adminCancel,
};
