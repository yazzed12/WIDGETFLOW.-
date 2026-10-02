import type {
  TemplateInsightDetail,
  TemplateInsightsMetricDefinitions,
  TemplateInsightsResponse,
  TemplateInsightsRange,
  TemplateInsightsSummary,
  TemplateUsagePagination,
  TemplateUsageRow,
  TemplateUsageStatusCounts,
  TemplateUsageTrendPoint,
  TemplateVersionUsage,
  TemplateUsagePeriodSummary,
  TemplateControlState,
} from './templateInsightsTypes';

type JsonObject = Record<string, unknown>;
const STATUS_KEYS = ['draft', 'completed', 'sent', 'returned', 'signed', 'rejected'] as const;

function object(value: unknown): JsonObject {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as JsonObject;
  throw new Error('Insights data is unavailable.');
}

function array(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  throw new Error('Insights data is unavailable.');
}

function field(source: JsonObject, camel: string, snake?: string): unknown {
  return source[camel] ?? (snake ? source[snake] : undefined);
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function number(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function boolean(value: unknown): boolean {
  return value === true;
}

function mapRange(value: unknown): TemplateInsightsRange {
  const source = object(value);
  return {
    startAt: text(field(source, 'startAt', 'start_at')),
    endAt: text(field(source, 'endAt', 'end_at')),
    endExclusive: field(source, 'endExclusive', 'end_exclusive') !== false,
    trendBucket: text(field(source, 'trendBucket', 'trend_bucket'), 'day'),
  };
}

function mapStatusCounts(value: unknown): TemplateUsageStatusCounts {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
  return Object.fromEntries(STATUS_KEYS.map((key) => [key, number(source[key])])) as unknown as TemplateUsageStatusCounts;
}

function mapTrend(value: unknown): TemplateUsageTrendPoint[] {
  return array(value).map((raw) => {
    const source = object(raw);
    return {
      bucketStart: text(field(source, 'bucketStart', 'bucket_start')),
      reportsCreated: number(field(source, 'reportsCreated', 'reports_created')),
    };
  });
}

function mapTemplate(raw: unknown): TemplateUsageRow {
  const source = object(raw);
  return {
    templateId: text(field(source, 'templateId', 'template_id')),
    templateDisplayId: nullableText(field(source, 'templateDisplayId', 'template_display_id')),
    templateName: text(field(source, 'templateName', 'template_name'), 'Untitled Template'),
    categoryId: nullableText(field(source, 'categoryId', 'category_id')),
    categoryName: nullableText(field(source, 'categoryName', 'category_name')),
    currentVersion: nullableText(field(source, 'currentVersion', 'current_version')),
    status: text(source.status),
    reportsCreated: number(field(source, 'reportsCreated', 'reports_created')),
    lifetimeReportsCreated: number(field(source, 'lifetimeReportsCreated', 'lifetime_reports_created')),
    uniqueUsers: number(field(source, 'uniqueUsers', 'unique_users')),
    lastUsedAt: nullableText(field(source, 'lastUsedAt', 'last_used_at')),
    neverUsed: boolean(field(source, 'neverUsed', 'never_used')),
    currentStatusCounts: mapStatusCounts(field(source, 'currentStatusCounts', 'current_status_counts')),
  };
}

function mapSummary(value: unknown): TemplateInsightsSummary {
  const source = object(value);
  return {
    approvedTemplates: number(field(source, 'approvedTemplates', 'approved_templates')),
    approvedTemplatesUsed: number(field(source, 'approvedTemplatesUsed', 'approved_templates_used')),
    approvedTemplatesNeverUsed: number(field(source, 'approvedTemplatesNeverUsed', 'approved_templates_never_used')),
    templateReportsCreated: number(field(source, 'templateReportsCreated', 'template_reports_created')),
    uniqueTemplateUsers: number(field(source, 'uniqueTemplateUsers', 'unique_template_users')),
    approvedTemplatesActiveInPeriod: number(field(source, 'approvedTemplatesActiveInPeriod', 'approved_templates_active_in_period')),
  };
}

function mapMetricDefinitions(value: unknown): TemplateInsightsMetricDefinitions {
  const source = object(value);
  return {
    reportsCreated: text(field(source, 'reportsCreated', 'reports_created')),
    uniqueUsers: text(field(source, 'uniqueUsers', 'unique_users')),
    lastUsed: text(field(source, 'lastUsed', 'last_used')),
    neverUsed: text(field(source, 'neverUsed', 'never_used')),
    currentStatusCounts: text(field(source, 'currentStatusCounts', 'current_status_counts')),
  };
}

function mapPagination(value: unknown): TemplateUsagePagination {
  const source = object(value);
  return {
    limit: number(source.limit),
    offset: number(source.offset),
    total: number(source.total),
  };
}

export function mapTemplateInsightsResponse(value: unknown): TemplateInsightsResponse {
  const source = object(value);
  return {
    range: mapRange(source.range),
    metricDefinitions: mapMetricDefinitions(field(source, 'metricDefinitions', 'metric_definitions')),
    summary: mapSummary(source.summary),
    templates: array(source.templates).map(mapTemplate),
    trend: mapTrend(source.trend),
    pagination: mapPagination(source.pagination),
  };
}

function mapVersionUsage(raw: unknown): TemplateVersionUsage {
  const source = object(raw);
  return {
    templateVersionId: text(field(source, 'templateVersionId', 'template_version_id')),
    versionLabel: text(field(source, 'versionLabel', 'version_label'), 'Version'),
    publishedAt: nullableText(field(source, 'publishedAt', 'published_at')),
    lifetimeReportsCreated: number(field(source, 'lifetimeReportsCreated', 'lifetime_reports_created')),
    reportsCreated: number(field(source, 'reportsCreated', 'reports_created')),
  };
}

export function mapTemplateInsightDetail(value: unknown): TemplateInsightDetail {
  const source = object(value);
  const template = object(source.template);
  const summary = object(source.summary);
  const mappedTemplate = mapTemplate({
    ...template,
    reportsCreated: 0,
    lifetimeReportsCreated: 0,
    uniqueUsers: 0,
    lastUsedAt: null,
    neverUsed: false,
    currentStatusCounts: field(source, 'currentStatusCounts', 'current_status_counts'),
  });
  return {
    template: {
      templateId: mappedTemplate.templateId,
      templateDisplayId: mappedTemplate.templateDisplayId,
      templateName: mappedTemplate.templateName,
      categoryId: mappedTemplate.categoryId,
      categoryName: mappedTemplate.categoryName,
      currentVersion: mappedTemplate.currentVersion,
      status: mappedTemplate.status,
    },
    range: mapRange(source.range),
    summary: {
      lifetimeReportsCreated: number(field(summary, 'lifetimeReportsCreated', 'lifetime_reports_created')),
      reportsCreated: number(field(summary, 'reportsCreated', 'reports_created')),
      uniqueUsers: number(field(summary, 'uniqueUsers', 'unique_users')),
      lastUsedAt: nullableText(field(summary, 'lastUsedAt', 'last_used_at')),
    },
    currentStatusCounts: mapStatusCounts(field(source, 'currentStatusCounts', 'current_status_counts')),
    versionUsage: array(field(source, 'versionUsage', 'version_usage')).map(mapVersionUsage),
    trend: mapTrend(source.trend),
  };
}

export function mapTemplateUsagePeriodSummary(value: unknown): TemplateUsagePeriodSummary {
  const source = object(value);
  const range = mapRange(source.range);
  return {
    startAt: range.startAt,
    endAt: range.endAt,
    endExclusive: range.endExclusive,
    templatesApproved: number(field(source, 'templatesApproved', 'templates_approved')),
    activeTemplates: number(field(source, 'activeTemplates', 'active_templates')),
    templatesWithNoActivity: number(field(source, 'templatesWithNoActivity', 'templates_with_no_activity')),
    reportsCreated: number(field(source, 'reportsCreated', 'reports_created')),
    uniqueUsers: number(field(source, 'uniqueUsers', 'unique_users')),
    reportsPerActiveTemplate: number(field(source, 'reportsPerActiveTemplate', 'reports_per_active_template')),
  };
}

export function mapTemplateControlStates(value: unknown): TemplateControlState[] {
  const values = Array.isArray(value) ? value : (() => {
    const source = object(value);
    const rows = field(source, 'states', 'items');
    return array(rows);
  })();
  return values.map((raw) => {
    const source = object(raw);
    return {
      templateId: text(field(source, 'templateId', 'template_id')),
      status: text(source.status),
      isPaused: boolean(field(source, 'isPaused', 'is_paused')),
      pausedAt: nullableText(field(source, 'pausedAt', 'paused_at')),
      pauseReason: nullableText(field(source, 'pauseReason', 'pause_reason')),
    };
  });
}
