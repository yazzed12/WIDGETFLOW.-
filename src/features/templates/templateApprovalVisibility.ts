import type { WidgetTemplate } from '../../types';

/**
 * Presentation guard for rows already returned by the canonical RLS-filtered
 * approval query. It deliberately does not re-evaluate ROLE_QUEUE or
 * SPECIFIC_USER routing/claim ownership in the browser.
 */
export function canReviewVisibleTemplate(
  template: Pick<WidgetTemplate, 'status' | 'createdById'>,
  actorUserId: string,
  canViewApprovals: boolean,
): boolean {
  return template.status === 'Pending Approval' &&
    template.createdById !== actorUserId &&
    canViewApprovals;
}
