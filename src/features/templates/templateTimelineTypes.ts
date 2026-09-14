export interface TemplateTimelineEvent {
  id: string;
  eventType: string;
  occurredAt: string;
  actorUserId: string | null;
  actorName: string;
  actorRoleName: string;
  fromStatus: string | null;
  toStatus: string | null;
  actionLabel: string;
  description: string;
  reason: string | null;
}
