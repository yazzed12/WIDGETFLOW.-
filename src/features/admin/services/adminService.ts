import { adminReadRepository } from '../repositories/adminReadRepository';
import { adminMutationRepository } from '../repositories/adminMutationRepository';
import { normalizeError } from '../../../lib/errors/errorHandling';

const FRIENDLY_ERRORS: Record<string, string> = {
  ADMIN_REQUIRED: 'An active protected Admin is required.',
  ACCOUNT_INACTIVE: 'This WidgetFlow account is not active.',
  EMAIL_ALREADY_EXISTS: 'An account already uses this email address.',
  ROLE_NOT_FOUND: 'The requested role was not found.',
  ROLE_INACTIVE: 'The requested role is inactive.',
  INVALID_INPUT: 'The request is invalid.',
  PROTECTED_ADMIN: 'The protected Admin role or account cannot be changed here.',
  PROTECTED_SYSTEM_ROLE: 'System role identity, governance level, and active status are protected.',
  LAST_ACTIVE_ADMIN: 'The last active protected Admin cannot be changed.',
  ROLE_IN_USE: 'This role still has active users and cannot be deactivated.',
  ROLE_NAME_EXISTS: 'A role with this name already exists.',
  CATEGORY_NAME_EXISTS: 'A category with this name already exists.',
  CATEGORY_NOT_FOUND: 'The category was not found.',
  INVALID_PERMISSION_KEYS: 'One or more permissions are invalid.',
  GOVERNANCE_REVIEWER_DEPENDENCY: 'This user or role is required by a specific-user governance route.',
  GOVERNANCE_ROLE_QUEUE_EMPTY: 'This change would leave a governance role queue without an eligible reviewer.',
  PACK_NOT_FOUND: 'The Standard Pack was not found.',
  PACK_DRAFT_NOT_FOUND: 'The Standard Pack has no editable draft version.',
  PACK_PUBLISHED_VERSION_NOT_FOUND: 'The Standard Pack has no published version.',
  PACK_ALREADY_ARCHIVED: 'Archived Standard Packs cannot be changed.',
  PACK_INVALID_STATUS: 'The Standard Pack status is invalid.',
  PACK_INVALID_PAYLOAD: 'The Standard Pack payload is invalid.',
  PACK_NAME_REQUIRED: 'A Standard Pack name is required.',
  PACK_CATEGORY_NOT_FOUND: 'The selected category was not found or is inactive.',
  PACK_VERSION_CONFLICT: 'A draft version already exists for this Standard Pack.',
  PACK_VERSION_IMMUTABLE: 'Published and superseded Pack versions are immutable.',
};

async function safe<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error) {
    const rawMessage = error instanceof Error ? error.message : '';
    const existing = Object.values(FRIENDLY_ERRORS).find((value) => value === rawMessage);
    if (existing) throw new Error(existing);
    const normalized = normalizeError(error);
    const message = normalized.message;
    const match = Object.entries(FRIENDLY_ERRORS).find(([code]) => normalized.code === code || message.includes(code));
    if (match && !['INVALID_EMAIL', 'INVALID_PASSWORD'].includes(normalized.code)) throw new Error(match[1]);
    if (normalized.code === 'INVALID_EMAIL' || normalized.code === 'INVALID_PASSWORD') throw normalized;
    if (Object.values(FRIENDLY_ERRORS).includes(message)) throw new Error(message);
    throw new Error('The operation could not be completed. Please retry.');
  }
}

export const adminService = {
  overview: () => safe(() => adminReadRepository.overview()),
  users: () => safe(() => adminReadRepository.users()),
  roleCatalog: () => safe(() => adminReadRepository.roleCatalog()),
  categories: () => safe(() => adminReadRepository.categories()),
  audit: () => safe(() => adminReadRepository.audit()),
  packs: () => safe(() => adminReadRepository.packs()),
  createUser: (input: Record<string, unknown>) => safe(() => adminMutationRepository.createUser(input)),
  createAdmin: (input: Record<string, unknown>) => safe(() => adminMutationRepository.createAdmin(input)),
  resetPassword: (id: string, password: string) => safe(() => adminMutationRepository.resetPassword(id, password)),
  setUserStatus: (id: string, status: string) => safe(() => adminMutationRepository.setUserStatus(id, status)),
  changeUserRole: (id: string, roleId: string, reason?: string) => safe(() => adminMutationRepository.changeUserRole(id, roleId, reason)),
  createRole: (input: Parameters<typeof adminMutationRepository.createRole>[0]) => safe(() => adminMutationRepository.createRole(input)),
  updateRole: (id: string, input: Parameters<typeof adminMutationRepository.updateRole>[1]) => safe(() => adminMutationRepository.updateRole(id, input)),
  createCategory: (input: Parameters<typeof adminMutationRepository.createCategory>[0]) => safe(() => adminMutationRepository.createCategory(input)),
  updateCategory: (id: string, input: Parameters<typeof adminMutationRepository.updateCategory>[1]) => safe(() => adminMutationRepository.updateCategory(id, input)),
  createPack: (input: Parameters<typeof adminMutationRepository.createPack>[0]) => safe(() => adminMutationRepository.createPack(input)),
  savePackDraft: (id: string, input: Parameters<typeof adminMutationRepository.savePackDraft>[1]) => safe(() => adminMutationRepository.savePackDraft(id, input)),
  createPackVersion: (id: string) => safe(() => adminMutationRepository.createPackVersion(id)),
  publishPack: (id: string, versionId: string) => safe(() => adminMutationRepository.publishPack(id, versionId)),
  disablePack: (id: string) => safe(() => adminMutationRepository.setPackStatus(id, 'disabled')),
  enablePack: (id: string) => safe(() => adminMutationRepository.setPackStatus(id, 'published')),
  archivePack: (id: string) => safe(() => adminMutationRepository.setPackStatus(id, 'archived')),
};
