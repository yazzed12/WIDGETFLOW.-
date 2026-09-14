import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import type { TemplateTimelineEvent } from './templateTimelineTypes';

export const templateTimelineRepository = {
  async get(templateId: string): Promise<TemplateTimelineEvent[]> {
    const { data, error } = await getSupabaseBrowserClient().rpc('get_template_timeline', {
      p_template_id: templateId,
    });
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map((row: any) => ({
      id: String(row.id),
      eventType: String(row.event_type ?? ''),
      occurredAt: String(row.occurred_at),
      actorUserId: row.actor_user_id ?? null,
      actorName: String(row.actor_name ?? 'Unknown user'),
      actorRoleName: String(row.actor_role_name ?? ''),
      fromStatus: row.from_status ?? null,
      toStatus: row.to_status ?? null,
      actionLabel: String(row.action_label ?? 'Template updated'),
      description: String(row.description ?? ''),
      reason: row.reason ?? null,
    }));
  },
};
