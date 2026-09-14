import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import type { ActivityCategory, ActivityPage, OrganizationActivityEvent } from './activityTypes';

type Row = Record<string, unknown>;

function mapRow(row: Row): OrganizationActivityEvent {
  return {
    id: String(row.id), eventType: String(row.event_type ?? ''),
    category: row.category as ActivityCategory,
    occurredAt: String(row.occurred_at), actorUserId: (row.actor_user_id as string | null) ?? null,
    actorName: String(row.actor_name ?? 'Unknown user'), actorRoleName: String(row.actor_role_name ?? ''),
    entityType: row.entity_type as 'template' | 'report', entityId: String(row.entity_id),
    entityDisplayName: String(row.entity_display_name ?? 'Untitled record'),
    actionLabel: String(row.action_label ?? 'Updated record'), description: String(row.description ?? ''),
    reason: (row.reason as string | null) ?? null, fromStatus: (row.from_status as string | null) ?? null,
    toStatus: (row.to_status as string | null) ?? null,
  };
}

export const activityRepository = {
  async list(options: { category?: ActivityCategory | null; eventType?: string | null; dateFrom?: string | null; dateTo?: string | null; limit?: number; before?: { occurredAt: string; id: string } | null } = {}): Promise<ActivityPage> {
    const { data, error } = await getSupabaseBrowserClient().rpc('list_organization_activity', {
      p_category: options.category ?? null,
      p_event_type: options.eventType ?? null,
      p_date_from: options.dateFrom ?? null,
      p_date_to: options.dateTo ?? null,
      p_limit: options.limit ?? 25,
      p_before_occurred_at: options.before?.occurredAt ?? null,
      p_before_id: options.before?.id ?? null,
    });
    if (error) throw error;
    const rows = (Array.isArray(data) ? data : []).map((row) => mapRow(row as Row));
    const last = rows.at(-1);
    return { rows, nextCursor: last ? { occurredAt: last.occurredAt, id: last.id } : null };
  },
};
