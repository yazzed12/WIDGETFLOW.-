export type DateRangePreset = '7d' | '30d' | '90d' | '12m';
export type UsageState = 'all' | 'used' | 'never_used';
export type SortKey = 'reports_created' | 'unique_users' | 'last_used' | 'template_name';
export type SortDirection = 'asc' | 'desc';
export type ReportStatusKey = 'draft' | 'completed' | 'sent' | 'returned' | 'signed' | 'rejected';

export interface TemplateUsageStatusCounts {
  draft: number;
  completed: number;
  sent: number;
  returned: number;
  signed: number;
  rejected: number;
}

export interface TemplateInsightsSummary {
  approvedTemplates: number;
  approvedTemplatesUsed: number;
  approvedTemplatesNeverUsed: number;
  templateReportsCreated: number;
  uniqueTemplateUsers: number;
  approvedTemplatesActiveInPeriod: number;
}

export interface TemplateUsagePeriodSummary {
  startAt: string;
  endAt: string;
  endExclusive: boolean;
  templatesApproved: number;
  activeTemplates: number;
  templatesWithNoActivity: number;
  reportsCreated: number;
  uniqueUsers: number;
  reportsPerActiveTemplate: number;
}

export interface TemplateUsageRow {
  templateId: string;
  templateDisplayId: string | null;
  templateName: string;
  categoryId: string | null;
  categoryName: string | null;
  currentVersion: string | null;
  status: string;
  reportsCreated: number;
  lifetimeReportsCreated: number;
  uniqueUsers: number;
  lastUsedAt: string | null;
  neverUsed: boolean;
  currentStatusCounts: TemplateUsageStatusCounts;
}

export interface TemplateControlState {
  templateId: string;
  status: string;
  isPaused: boolean;
  pausedAt: string | null;
  pauseReason: string | null;
}

export interface TemplateUsageTrendPoint {
  bucketStart: string;
  reportsCreated: number;
}

export interface TemplateUsagePagination {
  limit: number;
  offset: number;
  total: number;
}

export interface TemplateInsightsRange {
  startAt: string;
  endAt: string;
  endExclusive: boolean;
  trendBucket: string;
}

export interface TemplateInsightsMetricDefinitions {
  reportsCreated: string;
  uniqueUsers: string;
  lastUsed: string;
  neverUsed: string;
  currentStatusCounts: string;
}

export interface TemplateInsightsResponse {
  range: TemplateInsightsRange;
  metricDefinitions: TemplateInsightsMetricDefinitions;
  summary: TemplateInsightsSummary;
  templates: TemplateUsageRow[];
  trend: TemplateUsageTrendPoint[];
  pagination: TemplateUsagePagination;
}

export interface TemplateVersionUsage {
  templateVersionId: string;
  versionLabel: string;
  publishedAt: string | null;
  lifetimeReportsCreated: number;
  reportsCreated: number;
}

export interface TemplateInsightDetailSummary {
  lifetimeReportsCreated: number;
  reportsCreated: number;
  uniqueUsers: number;
  lastUsedAt: string | null;
}

export interface TemplateInsightDetail {
  template: Omit<TemplateUsageRow, 'reportsCreated' | 'lifetimeReportsCreated' | 'uniqueUsers' | 'lastUsedAt' | 'neverUsed' | 'currentStatusCounts'>;
  range: TemplateInsightsRange;
  summary: TemplateInsightDetailSummary;
  currentStatusCounts: TemplateUsageStatusCounts;
  versionUsage: TemplateVersionUsage[];
  trend: TemplateUsageTrendPoint[];
}

export interface TemplateInsightsOptions {
  startAt: string;
  endAt: string;
  categoryId: string | null;
  search: string | null;
  usageState: UsageState;
  sort: SortKey;
  sortDirection: SortDirection;
  limit: number;
  offset: number;
}

export interface TemplateInsightDetailOptions {
  startAt: string;
  endAt: string;
}
