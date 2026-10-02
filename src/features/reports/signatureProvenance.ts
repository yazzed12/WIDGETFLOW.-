export interface DelegatedSignatureSnapshotDisplay {
  authorityRoleName: string;
  delegatedByName: string;
}

/** Reads immutable event snapshots only; it never consults current delegation state. */
export function getDelegatedSignatureSnapshot(value: unknown): DelegatedSignatureSnapshotDisplay | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (!row.delegationId || typeof row.authorityRoleNameSnapshot !== 'string' || typeof row.delegatedByNameSnapshot !== 'string') return null;
  return {
    authorityRoleName: row.authorityRoleNameSnapshot,
    delegatedByName: row.delegatedByNameSnapshot,
  };
}
