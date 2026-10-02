export type ActivityCategory = 'template' | 'report' | 'signature';

export interface OrganizationActivityEvent {
  id: string;
  eventType: string;
  category: ActivityCategory;
  occurredAt: string;
  actorUserId: string | null;
  actorName: string;
  actorRoleName: string;
  entityType: 'template' | 'report';
  entityId: string;
  entityDisplayName: string;
  actionLabel: string;
  description: string;
  reason: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  delegationId?: string | null;
  delegatedByUserId?: string | null;
  delegatedByName?: string | null;
  authorityRoleId?: string | null;
  authorityRoleKey?: string | null;
  authorityRoleName?: string | null;
  authorityGovernanceLevel?: string | null;
  delegationStartAt?: string | null;
  delegationEndAt?: string | null;
}

export interface ActivityPage {
  rows: OrganizationActivityEvent[];
  nextCursor: { occurredAt: string; id: string } | null;
}
