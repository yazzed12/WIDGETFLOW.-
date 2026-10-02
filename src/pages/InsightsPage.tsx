import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Info, Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { templateInsightsService } from '../features/insights/templateInsightsService';
import { createTemplateInsightsDateRange } from '../features/insights/templateInsightsDateRange';
import { TemplateUsageTrendChart } from '../features/insights/components/TemplateUsageTrendChart';
import type { DateRangePreset, SortDirection, SortKey, TemplateInsightDetail, TemplateInsightsResponse, TemplateUsagePeriodSummary, TemplateUsageRow, UsageState } from '../features/insights/templateInsightsTypes';
import { formatDateTime } from '../shared/dateTime';
import { TemplateUsageActions } from '../components/insights/TemplateUsageActions';
import type { TemplateControlState } from '../features/insights/templateInsightsTypes';
import { canAccessInsights } from '../features/insights/templateInsightsAccess';

const PAGE_SIZE = 25;
const PRESETS: Array<{ value: DateRangePreset; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
];
const STATUS_ORDER = ['draft', 'completed', 'sent', 'signed', 'returned', 'rejected'] as const;
const STATUS_LABELS: Record<(typeof STATUS_ORDER)[number], string> = {
  draft: 'Draft', completed: 'Completed', sent: 'Sent', signed: 'Signed', returned: 'Returned', rejected: 'Rejected',
};
const SAFE_ERROR = "We couldn't load Template insights. Please try again.";

function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatAverage(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function showDateRange(startAt: string, endAt: string): string {
  return `${formatDateTime(startAt)} – ${formatDateTime(endAt)}`;
}

function MetricCard({ label, value, semantics, tip }: { label: string; value: number | string; semantics: string; tip: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        {label}<span className="group relative inline-flex" tabIndex={0} aria-label={tip}>
          <Info className="h-3.5 w-3.5 text-slate-400" /><span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-900 p-2 text-[11px] font-normal text-white shadow-lg group-hover:block group-focus:block">{tip}</span>
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{typeof value === 'number' ? formatCount(value) : value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{semantics}</div>
    </article>
  );
}

function StatusSummary({ counts, label }: { counts: TemplateUsageRow['currentStatusCounts']; label: string }) {
  const rows = STATUS_ORDER.filter((status) => counts[status] > 0);
  return <div className="min-w-40"><div className="text-[10px] font-semibold text-slate-500">{label}</div><div className="mt-1 flex flex-wrap gap-1">{rows.length ? rows.map((status) => <span key={status} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">{STATUS_LABELS[status]} {formatCount(counts[status])}</span>) : <span className="text-[10px] text-slate-400">No reports</span>}</div></div>;
}

function TemplateDetailDrawer({ template, detail, loading, error, onClose, onRetry, onOpenTemplate, range, preset, isPaused }: {
  template: TemplateUsageRow;
  detail: TemplateInsightDetail | null;
  loading: boolean;
  error: boolean;
  onClose: () => void;
  onRetry: () => void;
  onOpenTemplate: (() => void) | null;
  range: { startAt: string; endAt: string };
  preset: DateRangePreset;
  isPaused: boolean;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="insight-detail-title" className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-slate-50 shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Template Insights</div><h2 id="insight-detail-title" className="mt-1 truncate text-lg font-bold text-slate-900">{template.templateName}</h2>{template.templateDisplayId && <div className="mt-1 font-mono text-[11px] text-slate-500">{template.templateDisplayId}</div>}</div><button type="button" onClick={onClose} aria-label="Close template insights" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"><X className="h-4 w-4" /></button></div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600"><span>{template.categoryName ?? 'Uncategorized'}</span><span>·</span><span>Version {template.currentVersion ?? '—'}</span><span>·</span><span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">{template.status}</span>{isPaused && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">Paused</span>}{onOpenTemplate && <button type="button" onClick={onOpenTemplate} className="ml-auto font-semibold text-indigo-600 hover:text-indigo-800">Open Template</button>}</div>
        </header>
        {loading ? <div className="space-y-3 p-5" aria-live="polite"><div className="h-24 animate-pulse rounded-xl bg-slate-200"/><div className="h-56 animate-pulse rounded-xl bg-slate-200"/><div className="h-32 animate-pulse rounded-xl bg-slate-200"/></div> : error || !detail ? <div className="m-5 rounded-xl border border-rose-200 bg-white p-6 text-center"><p className="text-sm text-slate-700">{SAFE_ERROR}</p><button type="button" onClick={onRetry} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Retry</button></div> : (
          <div className="space-y-4 p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-3"><MetricCard label="Reports Created" value={detail.summary.reportsCreated} semantics="Selected period" tip="Template-backed Reports created during the selected period."/><MetricCard label="Lifetime Reports" value={detail.summary.lifetimeReportsCreated} semantics="All time" tip="All Template-backed Reports created from this Template across its lifetime."/><MetricCard label="Unique Users" value={detail.summary.uniqueUsers} semantics="Selected period" tip="Distinct users who created at least one Template-backed Report during the selected period."/><MetricCard label="Last Used" value={detail.summary.lastUsedAt ? formatDateTime(detail.summary.lastUsedAt) : 'Never used'} semantics="Lifetime" tip="Most recent Report creation from this Template, across its lifetime."/></div>
            <TemplateUsageTrendChart key={`${preset}:${range.startAt}:${range.endAt}:detail`} title="Reports Created from This Template" points={detail.trend} startAt={range.startAt} endAt={range.endAt} preset={preset} trendBucket={detail.range.trendBucket} />
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"><h3 className="text-sm font-bold text-slate-900">Exact Version Usage</h3><p className="mt-1 text-[11px] text-slate-500">Each published Template version is shown separately.</p>{detail.versionUsage.length === 0 ? <p className="py-5 text-xs text-slate-500">No version usage is available.</p> : <div className="mt-3 divide-y divide-slate-100">{detail.versionUsage.map((version) => <div key={version.templateVersionId} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><div className="text-xs font-semibold text-slate-800">{version.versionLabel}</div><div className="mt-1 text-[10px] text-slate-500">Published {version.publishedAt ? formatDateTime(version.publishedAt) : 'date unavailable'}</div></div><div className="text-right"><div className="text-xs font-bold text-slate-800">{formatCount(version.reportsCreated)} period</div><div className="text-[10px] text-slate-500">{formatCount(version.lifetimeReportsCreated)} lifetime</div></div></div>)}</div>}</section>
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"><h3 className="text-sm font-bold text-slate-900">Current Status of Reports Created in Selected Period</h3><div className="mt-3 flex flex-wrap gap-2">{STATUS_ORDER.map((status) => <div key={status} className="rounded-lg bg-slate-50 px-3 py-2"><div className="text-[10px] text-slate-500">{STATUS_LABELS[status]}</div><div className="text-sm font-bold text-slate-800">{formatCount(detail.currentStatusCounts[status])}</div></div>)}</div></section>
          </div>
        )}
      </aside>
    </div>
  );
}

export const InsightsPage: React.FC = () => {
  const { insightsAccess, refreshInsightsAccess, showToast, categories, templates, openTemplateDetail, templateArchiveRevision, lastArchivedTemplateId } = useApp();
  const allowed = canAccessInsights(insightsAccess);
  const accessFailureChecks = useRef(new Set<string>());
  const refreshAccessAfterFailure = useCallback((key: string) => {
    if (accessFailureChecks.current.has(key)) return;
    accessFailureChecks.current.add(key);
    void refreshInsightsAccess().then((stillAllowed) => {
      if (stillAllowed === false) showToast('Your access to Insights has changed.', 'warning');
    });
  }, [refreshInsightsAccess, showToast]);
  const [preset, setPreset] = useState<DateRangePreset>('30d');
  const range = useMemo(() => createTemplateInsightsDateRange(preset), [preset]);
  const [categoryId, setCategoryId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [usageState, setUsageState] = useState<UsageState>('all');
  const [sort, setSort] = useState<SortKey>('reports_created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [offset, setOffset] = useState(0);
  const [mainRetry, setMainRetry] = useState(0);
  const [queryState, setQueryState] = useState<{ key: string; result?: TemplateInsightsResponse; error: boolean } | null>(null);
  const [periodSummaryRetry, setPeriodSummaryRetry] = useState(0);
  const [periodSummaryState, setPeriodSummaryState] = useState<{ key: string; summary?: TemplateUsagePeriodSummary; error: boolean } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateUsageRow | null>(null);
  const [detailState, setDetailState] = useState<{ key: string; detail?: TemplateInsightDetail; error: boolean } | null>(null);
  const [detailRetry, setDetailRetry] = useState(0);
  const [controlRetry, setControlRetry] = useState(0);
  const [controlStateData, setControlStateData] = useState<{ key: string; states: Map<string, TemplateControlState>; error: boolean } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const requestOptions = useMemo(() => ({
    startAt: range.startAt, endAt: range.endAt, categoryId: categoryId || null,
    search: search || null, usageState, sort, sortDirection, limit: PAGE_SIZE, offset,
  }), [range.startAt, range.endAt, categoryId, search, usageState, sort, sortDirection, offset]);
  const requestKey = JSON.stringify(requestOptions);
  const queryRequestKey = `${requestKey}:${mainRetry}:${templateArchiveRevision}`;
  const result = queryState?.key === queryRequestKey ? queryState.result ?? null : null;
  const loading = allowed && queryState?.key !== queryRequestKey;
  const error = queryState?.key === queryRequestKey && queryState.error;

  useEffect(() => {
    if (!allowed) return;
    let current = true;
    templateInsightsService.getTemplateUsageInsights(requestOptions).then((response) => {
      if (current) setQueryState({ key: queryRequestKey, result: response, error: false });
    }).catch(() => {
      if (current) {
        setQueryState({ key: queryRequestKey, error: true });
        refreshAccessAfterFailure(`usage:${queryRequestKey}`);
      }
    });
    return () => { current = false; };
  }, [allowed, queryRequestKey, requestOptions, refreshAccessAfterFailure]);

  const visibleTemplateIds = useMemo(() => result?.templates.map((row) => row.templateId) ?? [], [result]);
  const controlStateKey = `${queryRequestKey}:${visibleTemplateIds.join(',')}`;
  const controlStates = controlStateData?.key === controlStateKey ? controlStateData.states : null;
  const controlStatesLoading = allowed && visibleTemplateIds.length > 0 && controlStateData?.key !== controlStateKey;
  const controlStatesError = controlStateData?.key === controlStateKey && controlStateData.error;

  useEffect(() => {
    if (!allowed || visibleTemplateIds.length === 0) return;
    let current = true;
    templateInsightsService.getTemplateControlStates(visibleTemplateIds).then((states) => {
      if (current) setControlStateData({ key: controlStateKey, states: new Map(states.map((state) => [state.templateId, state])), error: false });
    }).catch(() => {
      if (current) {
        setControlStateData({ key: controlStateKey, states: new Map(), error: true });
        refreshAccessAfterFailure(`controls:${controlStateKey}`);
      }
    });
    return () => { current = false; };
  }, [allowed, visibleTemplateIds, controlStateKey, controlRetry, refreshAccessAfterFailure]);

  const refreshControlStates = useCallback(() => setControlRetry((value) => value + 1), []);
  const updateControlState = useCallback((state: TemplateControlState) => {
    setControlStateData((current) => {
      if (current?.key !== controlStateKey) return current;
      const states = new Map(current.states);
      states.set(state.templateId, state);
      return { ...current, states };
    });
  }, [controlStateKey]);

  const periodSummaryKey = `${range.startAt}:${range.endAt}:${categoryId || 'all'}:${periodSummaryRetry}:${templateArchiveRevision}`;
  const periodSummary = periodSummaryState?.key === periodSummaryKey ? periodSummaryState.summary ?? null : null;
  const periodSummaryLoading = allowed && periodSummaryState?.key !== periodSummaryKey;
  const periodSummaryError = periodSummaryState?.key === periodSummaryKey && periodSummaryState.error;
  useEffect(() => {
    if (!allowed) return;
    let current = true;
    templateInsightsService.getTemplateUsagePeriodSummary({
      startAt: range.startAt,
      endAt: range.endAt,
      categoryId: categoryId || null,
    }).then((summary) => {
      if (current) setPeriodSummaryState({ key: periodSummaryKey, summary, error: false });
    }).catch(() => {
      if (current) {
        setPeriodSummaryState({ key: periodSummaryKey, error: true });
        refreshAccessAfterFailure(`summary:${periodSummaryKey}`);
      }
    });
    return () => { current = false; };
  }, [allowed, range.startAt, range.endAt, categoryId, periodSummaryKey, refreshAccessAfterFailure]);

  const activeSelectedTemplate = lastArchivedTemplateId && selectedTemplate?.templateId === lastArchivedTemplateId ? null : selectedTemplate;
  const selectedTemplateId = activeSelectedTemplate?.templateId;
  const detailRequestKey = `${selectedTemplateId ?? ''}:${range.startAt}:${range.endAt}:${detailRetry}:${templateArchiveRevision}`;
  const detail = detailState?.key === detailRequestKey ? detailState.detail ?? null : null;
  const detailLoading = Boolean(selectedTemplateId) && detailState?.key !== detailRequestKey;
  const detailError = detailState?.key === detailRequestKey && detailState.error;
  useEffect(() => {
    if (!allowed || !selectedTemplateId) return;
    let current = true;
    templateInsightsService.getTemplateUsageInsightDetail(selectedTemplateId, { startAt: range.startAt, endAt: range.endAt }).then((response) => {
      if (current) setDetailState({ key: detailRequestKey, detail: response, error: false });
    }).catch(() => {
      if (current) {
        setDetailState({ key: detailRequestKey, error: true });
        refreshAccessAfterFailure(`detail:${detailRequestKey}`);
      }
    });
    return () => { current = false; };
  }, [allowed, selectedTemplateId, range.startAt, range.endAt, detailRetry, detailRequestKey, refreshAccessAfterFailure]);

  const selectTemplate = (template: TemplateUsageRow) => setSelectedTemplate(template);

  const changeSort = (next: SortKey) => {
    setOffset(0);
    if (sort === next) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    else { setSort(next); setSortDirection(next === 'template_name' || next === 'last_used' ? 'asc' : 'desc'); }
  };

  const changePreset = (value: DateRangePreset) => { setPreset(value); setOffset(0); };
  const changeCategory = (value: string) => { setCategoryId(value); setOffset(0); };
  const changeUsage = (value: UsageState) => { setUsageState(value); setOffset(0); };
  const activateNeverUsed = () => { setUsageState('never_used'); setOffset(0); };
  const retryDetail = () => setDetailRetry((value) => value + 1);

  const total = result?.pagination.total ?? 0;
  const startRow = total === 0 ? 0 : offset + 1;
  const endRow = Math.min(offset + PAGE_SIZE, total);
  const detailTemplateInContext = activeSelectedTemplate ? templates.find((item) => item.id === activeSelectedTemplate.templateId) : undefined;
  const hasUnfilteredLifetimeNoUsage = result?.summary.approvedTemplatesUsed === 0 && usageState === 'all' && !search && !categoryId;
  const emptyKind = result?.summary.approvedTemplates === 0 ? 'no-approved' : hasUnfilteredLifetimeNoUsage ? 'no-usage' : 'no-filters';

  if (insightsAccess.status === 'loading') return <output aria-live="polite" className="block rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Checking Insights access…</output>;
  if (insightsAccess.status === 'error') return <div role="alert" className="rounded-xl border border-rose-200 bg-white p-8 text-center text-sm text-slate-600"><p>We couldn't verify your Insights access.</p><button type="button" onClick={() => void refreshInsightsAccess()} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">Retry</button></div>;
  if (!allowed) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">You don’t have permission to view Insights.</div>;

  return (
    <div className="space-y-5 pb-10">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-600"/><h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Template Usage &amp; Adoption Insights</h1></div><p className="mt-2 max-w-2xl text-xs text-slate-500 sm:text-sm">Understand how approved Templates are being used across WidgetFlow.</p></div><div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-600"><CalendarDays className="h-3.5 w-3.5"/><span>{showDateRange(range.startAt, range.endAt)} <span className="text-slate-400">(end exclusive)</span></span></div></div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-[11px] font-semibold text-slate-600">Period<select value={preset} onChange={(event) => changePreset(event.target.value as DateRangePreset)} className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">{PRESETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="text-[11px] font-semibold text-slate-600">Category<select value={categoryId} onChange={(event) => changeCategory(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"><option value="">All categories</option>{categories.filter((category) => category.status !== 'Inactive').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="text-[11px] font-semibold text-slate-600">Usage<select value={usageState} onChange={(event) => changeUsage(event.target.value as UsageState)} className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"><option value="all">All</option><option value="used">Used</option><option value="never_used">Never Used (lifetime)</option></select></label>
          <label className="text-[11px] font-semibold text-slate-600">Search Templates<span className="relative mt-1.5 block"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or Template ID" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/></span></label>
        </div>
      </header>

      <section aria-label="Selected-period Template usage summary" aria-busy={periodSummaryLoading}>
        {periodSummaryLoading ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div> : periodSummaryError || !periodSummary ? <div role="alert" className="rounded-xl border border-rose-200 bg-white p-5 text-center"><p className="text-xs text-slate-700">{SAFE_ERROR} Summary metrics could not be refreshed.</p><button type="button" onClick={() => setPeriodSummaryRetry((value) => value + 1)} className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700">Retry summary</button></div> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="TEMPLATES APPROVED" value={periodSummary.templatesApproved} semantics="Approved during selected period" tip="Templates approved during the selected period." />
          <MetricCard label="ACTIVE TEMPLATES" value={periodSummary.activeTemplates} semantics="Used during selected period" tip="Distinct Templates that produced at least one Template-backed Report during the selected period." />
          <MetricCard label="NO ACTIVITY" value={periodSummary.templatesWithNoActivity} semantics="No Report activity in selected period" tip="Templates with no Template-backed Report activity during the selected period. A Template may have been used before this period." />
          <MetricCard label="REPORTS CREATED" value={periodSummary.reportsCreated} semantics="Created during selected period" tip="Template-backed Reports created during the selected period." />
          <MetricCard label="UNIQUE USERS" value={periodSummary.uniqueUsers} semantics="Created Template Reports during selected period" tip="Distinct users who created Template-backed Reports during the selected period." />
          <MetricCard label="REPORTS / ACTIVE TEMPLATE" value={formatAverage(periodSummary.reportsPerActiveTemplate)} semantics="Average during selected period" tip="The factual average Reports Created per Active Template during the selected period, as returned by the period summary." />
        </div>}
      </section>

      {loading ? <div className="space-y-4" aria-label="Loading Template usage"><div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white"/><div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white"/></div> : error ? <div role="alert" className="rounded-xl border border-rose-200 bg-white p-8 text-center"><p className="text-sm text-slate-700">{SAFE_ERROR}</p><button onClick={() => setMainRetry((value) => value + 1)} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Retry</button></div> : result ? <>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <TemplateUsageTrendChart key={`${preset}:${result.range.startAt}:${result.range.endAt}:${result.range.trendBucket}`} title="Template Reports Created Over Time" points={result.trend} startAt={result.range.startAt} endAt={result.range.endAt} preset={preset} trendBucket={result.range.trendBucket} />
          <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-xs"><div className="text-xs font-semibold text-indigo-900">Approved Templates Never Used</div><div className="mt-2 text-3xl font-bold text-slate-900">{formatCount(result.summary.approvedTemplatesNeverUsed)}</div><p className="mt-1 text-[11px] leading-relaxed text-slate-600">approved Template{result.summary.approvedTemplatesNeverUsed === 1 ? ' has' : 's have'} never been used to create a Report. This is a lifetime measure.</p>{result.summary.approvedTemplatesNeverUsed > 0 && <button type="button" onClick={activateNeverUsed} className="mt-4 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50">View never-used Templates</button>}</section>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5"><div><h2 className="text-sm font-bold text-slate-900">Template Usage</h2><p className="mt-1 text-[11px] text-slate-500">Reports and unique users use the selected period; Last Used and Never Used are lifetime measures.</p></div><div className="text-[11px] text-slate-500">Showing {startRow}–{endRow} of {formatCount(total)} Templates</div></div>
          {error && <div role="alert" className="border-b border-rose-100 bg-rose-50 px-5 py-2 text-[11px] text-rose-800">{SAFE_ERROR} <button onClick={() => setMainRetry((value) => value + 1)} className="ml-2 font-semibold underline">Retry</button></div>}
          {loading && <div className="h-1 animate-pulse bg-indigo-300" aria-label="Refreshing results"/>}
          {result.templates.length === 0 ? <div className="p-10 text-center"><h3 className="text-sm font-semibold text-slate-800">{emptyKind === 'no-approved' ? 'No approved Templates are available for Insights.' : emptyKind === 'no-usage' ? 'No approved Template has been used to create a Report yet.' : 'No Templates match these filters.'}</h3><p className="mt-2 text-xs text-slate-500">{emptyKind === 'no-filters' ? 'Adjust the date, category, usage, or search filters and try again.' : 'Lifetime usage is independent of the selected date period.'}</p></div> : <div className="overflow-x-auto"><table className="min-w-[1060px] w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-3"><SortButton label="Template" active={sort === 'template_name'} direction={sortDirection} onClick={() => changeSort('template_name')}/></th><th scope="col" className="px-3 py-3">Category</th><th scope="col" className="px-3 py-3">Version</th><th scope="col" className="px-3 py-3"><SortButton label="Reports Created" active={sort === 'reports_created'} direction={sortDirection} onClick={() => changeSort('reports_created')}/></th><th scope="col" className="px-3 py-3"><SortButton label="Unique Users" active={sort === 'unique_users'} direction={sortDirection} onClick={() => changeSort('unique_users')}/></th><th scope="col" className="px-3 py-3"><SortButton label="Last Used" active={sort === 'last_used'} direction={sortDirection} onClick={() => changeSort('last_used')}/></th><th scope="col" className="px-3 py-3">Current Status</th><th scope="col" className="px-3 py-3">Usage</th><th scope="col" className="px-3 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{result.templates.map((row) => { const control = controlStates?.get(row.templateId) ?? null; return <tr key={row.templateId} className="align-top hover:bg-slate-50"><td className="px-4 py-3"><button type="button" onClick={() => selectTemplate(row)} className="text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"><span className="flex max-w-64 items-center gap-2"><span className="block truncate text-xs font-semibold text-indigo-700 hover:text-indigo-900">{row.templateName}</span>{control?.isPaused && <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold normal-case text-amber-700">Paused</span>}</span>{row.templateDisplayId && <span className="mt-1 block font-mono text-[10px] text-slate-400">{row.templateDisplayId}</span>}</button></td><td className="px-3 py-3 text-xs text-slate-600">{row.categoryName ?? '—'}</td><td className="px-3 py-3 text-xs text-slate-600">{row.currentVersion ?? '—'}</td><td className="px-3 py-3"><div className="text-xs font-semibold text-slate-800">{formatCount(row.reportsCreated)}</div><div className="text-[10px] text-slate-400">{formatCount(row.lifetimeReportsCreated)} lifetime</div></td><td className="px-3 py-3 text-xs font-semibold text-slate-800">{formatCount(row.uniqueUsers)}</td><td className="px-3 py-3 text-[11px] text-slate-600">{row.lastUsedAt ? formatDateTime(row.lastUsedAt) : 'Never used'}</td><td className="px-3 py-3"><StatusSummary counts={row.currentStatusCounts} label="Current status of period Reports"/></td><td className="px-3 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${row.neverUsed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{row.neverUsed ? 'Never Used' : 'Used'}</span></td><td className="px-3 py-2 text-right" onClick={(event) => event.stopPropagation()}>{controlStatesError ? <button type="button" onClick={refreshControlStates} className="text-[10px] font-semibold text-indigo-700 underline">Retry controls</button> : <TemplateUsageActions template={row} controlState={control} loading={controlStatesLoading} onControlChange={updateControlState} onRefreshControlStates={refreshControlStates}/>}</td></tr>; })}</tbody></table></div>}
          <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><span className="text-[10px] text-slate-500">Page size {PAGE_SIZE} · server-paginated</span><div className="flex items-center gap-2"><button type="button" disabled={offset === 0 || loading} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5"/>Previous</button><span className="text-[10px] text-slate-500">{total === 0 ? 0 : Math.floor(offset / PAGE_SIZE) + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span><button type="button" disabled={offset + PAGE_SIZE >= total || loading} onClick={() => setOffset((value) => value + PAGE_SIZE)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight className="h-3.5 w-3.5"/></button></div></footer>
        </section>
      </> : null}

      {activeSelectedTemplate && <TemplateDetailDrawer template={activeSelectedTemplate} detail={detail} loading={detailLoading} error={detailError} onClose={() => { setSelectedTemplate(null); }} onRetry={retryDetail} onOpenTemplate={detailTemplateInContext ? () => { openTemplateDetail(detailTemplateInContext); setSelectedTemplate(null); } : null} range={range} preset={preset} isPaused={controlStates?.get(activeSelectedTemplate.templateId)?.isPaused === true} />}
    </div>
  );
};

function SortButton({ label, active, direction, onClick }: { label: string; active: boolean; direction: SortDirection; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-semibold hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label={`Sort by ${label}${active ? `, currently ${direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}>{label}{active && <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>}</button>;
}
