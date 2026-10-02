import type { DateRangePreset, TemplateUsageTrendPoint } from './templateInsightsTypes';

export type TrendBucketKind = 'day' | 'week' | 'month';

export interface NormalizedTrendPoint extends TemplateUsageTrendPoint {
  label: string;
  tooltipLabel: string;
}

function bucketKind(bucket: string | null | undefined, preset: DateRangePreset): TrendBucketKind {
  const normalized = bucket?.trim().toLowerCase() ?? '';
  if (normalized.includes('month')) return 'month';
  if (normalized.includes('week')) return 'week';
  if (normalized.includes('day')) return 'day';
  return preset === '12m' ? 'month' : preset === '90d' ? 'week' : 'day';
}

function floorToBucket(value: Date, kind: TrendBucketKind): Date {
  const day = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  if (kind === 'month') return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  if (kind === 'week') {
    const daysSinceMonday = (day.getUTCDay() + 6) % 7;
    day.setUTCDate(day.getUTCDate() - daysSinceMonday);
  }
  return day;
}

function incrementBucket(value: Date, kind: TrendBucketKind): Date {
  const next = new Date(value);
  if (kind === 'month') next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCDate(next.getUTCDate() + (kind === 'week' ? 7 : 1));
  return next;
}

function formatLabels(bucket: Date, kind: TrendBucketKind): { label: string; tooltipLabel: string } {
  if (kind === 'month') {
    return {
      label: new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(bucket),
      tooltipLabel: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(bucket),
    };
  }
  if (kind === 'week') {
    return {
      label: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(bucket),
      tooltipLabel: `Week of ${new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(bucket)}`,
    };
  }
  return {
    label: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(bucket),
    tooltipLabel: new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(bucket),
  };
}

/** Adds only missing zero-count time buckets; existing values are not altered or interpolated. */
export function normalizeTemplateUsageTrend(
  points: TemplateUsageTrendPoint[],
  startAt: string,
  endAt: string,
  preset: DateRangePreset,
  trendBucket?: string | null,
): NormalizedTrendPoint[] {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return [];
  const kind = bucketKind(trendBucket, preset);
  const first = floorToBucket(start, kind);
  const supplied = new Map<number, number>();
  for (const point of points) {
    const date = new Date(point.bucketStart);
    if (!Number.isFinite(date.getTime())) continue;
    const bucket = floorToBucket(date, kind);
    const key = bucket.getTime();
    if (key >= first.getTime() && key < end.getTime()) supplied.set(key, Math.max(0, point.reportsCreated));
  }

  const normalized: NormalizedTrendPoint[] = [];
  for (let bucket = new Date(first); bucket < end; bucket = incrementBucket(bucket, kind)) {
    const { label, tooltipLabel } = formatLabels(bucket, kind);
    normalized.push({
      bucketStart: bucket.toISOString(),
      reportsCreated: supplied.get(bucket.getTime()) ?? 0,
      label,
      tooltipLabel,
    });
  }
  return normalized;
}
