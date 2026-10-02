import type { InsightsAccessResolution } from './featureAccessTypes';

/** Fail-closed presentation gate over the backend's resolved feature-access result. */
export function canAccessInsights(access: InsightsAccessResolution): boolean {
  return access.status === 'ready' && access.insightsAllowed;
}
