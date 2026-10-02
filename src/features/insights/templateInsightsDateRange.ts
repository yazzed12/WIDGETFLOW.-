import type { DateRangePreset } from './templateInsightsTypes';

export interface ExactDateRange {
  startAt: string;
  endAt: string;
  start: Date;
  end: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_INSIGHTS_RANGE_MS = 366 * DAY_MS;

export function createTemplateInsightsDateRange(preset: DateRangePreset, now = new Date()): ExactDateRange {
  const end = new Date(now);
  const start = new Date(end);
  if (preset === '12m') {
    start.setUTCMonth(start.getUTCMonth() - 12);
  } else {
    const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
    start.setTime(end.getTime() - days * DAY_MS);
  }
  if (end.getTime() <= start.getTime() || end.getTime() - start.getTime() > MAX_INSIGHTS_RANGE_MS) {
    throw new Error('Insights date range is outside the supported period.');
  }
  return { startAt: start.toISOString(), endAt: end.toISOString(), start, end };
}

export function isSupportedTemplateInsightsRange(startAt: string, endAt: string): boolean {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  return Number.isFinite(start) && Number.isFinite(end) && end > start && end - start <= MAX_INSIGHTS_RANGE_MS;
}
