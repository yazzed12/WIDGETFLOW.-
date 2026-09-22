import { configurationRepository } from '../repositories/configurationRepository';

const FRIENDLY_ERRORS: Record<string, string> = {
  ADMIN_REQUIRED: 'An active protected Admin is required.',
  ACCOUNT_INACTIVE: 'This WidgetFlow account is not active.',
  FEATURE_NOT_FOUND: 'The requested feature setting was not found.',
  ELEMENT_NOT_FOUND: 'The requested element setting was not found.',
  CONTENT_ITEM_NOT_FOUND: 'The requested content item was not found.',
  INVALID_INPUT: 'The request is invalid.',
  INVALID_GOVERNANCE_ROUTE: 'One or more governance routes are incomplete.',
  INELIGIBLE_GOVERNANCE_ROLE: 'The selected role is not eligible to review templates.',
  INELIGIBLE_GOVERNANCE_REVIEWER: 'The selected reviewer is not active in the selected role.',
  GOVERNANCE_ROLE_QUEUE_EMPTY: 'The selected role has no active eligible reviewers.',
};

async function safe<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error) {
    const message = error instanceof Error ? error.message : 'The operation could not be completed.';
    const match = Object.entries(FRIENDLY_ERRORS).find(([code]) => message.includes(code));
    if (match) throw new Error(match[1]);
    throw new Error('The operation could not be completed. Please retry.');
  }
}

export const configurationService = {
  signatureRoleDirectory: () => safe(() => configurationRepository.signatureRoleDirectory()),
  activeRoles: () => safe(() => configurationRepository.activeRoles()),
  effectiveConfig: () => safe(() => configurationRepository.effectiveConfig()),
  features: () => safe(() => configurationRepository.features()),
  elements: () => safe(() => configurationRepository.elements()),
  contentLibrary: () => safe(() => configurationRepository.contentLibrary()),
  operationalContentLibrary: () => safe(() => configurationRepository.operationalContentLibrary()),
  packs: () => safe(() => configurationRepository.packs()),
  governance: () => safe(() => configurationRepository.governance()),
  setFeature: (key: string, enabled: boolean) => safe(() => configurationRepository.setFeature(key, enabled)),
  setElement: (key: string, enabled: boolean) => safe(() => configurationRepository.setElement(key, enabled)),
  updateSettings: (settings: Record<string, unknown>) => safe(() => configurationRepository.updateSettings(settings)),
  createContentItem: (item: Record<string, unknown>) => safe(() => configurationRepository.createContentItem(item)),
  updateContentItem: (id: string, item: Record<string, unknown>) => safe(() => configurationRepository.updateContentItem(id, item)),
  setContentItemEnabled: (id: string, enabled: boolean) => safe(() => configurationRepository.setContentItemEnabled(id, enabled)),
  updateGovernance: (routes: Record<string, unknown>) => safe(async () => {
    await configurationRepository.updateGovernance(routes);
    return configurationRepository.governance();
  }),
};
