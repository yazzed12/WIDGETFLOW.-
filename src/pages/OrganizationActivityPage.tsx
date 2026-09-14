import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, FileSignature, FileText, Loader2, RefreshCw } from 'lucide-react';
import { activityService } from '../features/activity/activityService';
import type { ActivityCategory, OrganizationActivityEvent } from '../features/activity/activityTypes';

const labels: Array<{ key: ActivityCategory | null; label: string }> = [
  { key: null, label: 'All' }, { key: 'template', label: 'Templates' }, { key: 'report', label: 'Reports' }, { key: 'signature', label: 'Signatures' },
];

function dayGroup(iso: string): string {
  const date = new Date(iso); const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const delta = Math.floor((start.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000);
  if (delta === 0) return 'Today'; if (delta === 1) return 'Yesterday'; if (delta < 7) return 'Earlier This Week'; return 'Older';
}

function EventRow({ event }: { event: OrganizationActivityEvent }) {
  const Icon = event.category === 'template' ? FileText : event.category === 'signature' ? FileSignature : CheckCircle2;
  return <div className="flex gap-3 py-4 border-b border-slate-100 last:border-0">
    <div className="mt-0.5 rounded-lg bg-indigo-50 p-2 text-indigo-600"><Icon className="w-4 h-4" /></div>
    <div className="min-w-0 flex-1"><p className="text-sm text-slate-800"><span className="font-semibold text-slate-900">{event.actorName}</span>{' '}<span>{event.description || event.actionLabel}</span>{' '}<span className="font-semibold text-indigo-700">“{event.entityDisplayName}”</span></p>
      {event.reason && <p className="mt-1 text-xs text-slate-600 italic">Reason: {event.reason}</p>}
      <p className="mt-1 text-[11px] text-slate-400">{new Date(event.occurredAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
    </div>
  </div>;
}

export const OrganizationActivityPage: React.FC = () => {
  const [category, setCategory] = useState<ActivityCategory | null>(null);
  const [events, setEvents] = useState<OrganizationActivityEvent[]>([]);
  const [cursor, setCursor] = useState<{ occurredAt: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true); setError(null);
    try { const page = await activityService.list({ category, limit: 25, before: append ? cursor : null }); setEvents((prev) => append ? [...prev, ...page.rows.filter((e) => !prev.some((p) => p.id === e.id))] : page.rows); setCursor(page.rows.length === 25 ? page.nextCursor : null); }
    catch { setError('Unable to load organization activity.'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [category, cursor]);
  useEffect(() => { setCursor(null); void (async () => { setLoading(true); setError(null); try { const page = await activityService.list({ category, limit: 25 }); setEvents(page.rows); setCursor(page.rows.length === 25 ? page.nextCursor : null); } catch { setError('Unable to load organization activity.'); } finally { setLoading(false); } })(); }, [category]);
  const grouped = useMemo(() => events.reduce<Record<string, OrganizationActivityEvent[]>>((acc, event) => { (acc[dayGroup(event.occurredAt)] ??= []).push(event); return acc; }, {}), [events]);
  return <div className="space-y-6 pb-12"><div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Activity className="w-6 h-6 text-indigo-600" />Organization Activity</h1><p className="text-sm text-slate-500 mt-1">Canonical business workflow activity across your organization.</p></div><button type="button" onClick={() => void load(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw className="w-4 h-4 inline mr-1" />Refresh</button></div>
    <div className="flex flex-wrap gap-2">{labels.map((item) => <button type="button" key={item.label} onClick={() => setCategory(item.key)} className={`rounded-full px-4 py-2 text-xs font-semibold ${category === item.key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'}`}>{item.label}</button>)}</div>
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">{loading ? <div className="py-12 text-center text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading activity…</div> : error ? <div className="py-12 text-center text-sm text-rose-600">{error}</div> : !events.length ? <div className="py-12 text-center text-sm text-slate-500">No organization activity to show yet.</div> : Object.entries(grouped).map(([group, items]) => <section key={group}><h2 className="pt-2 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">{group}</h2>{items.map((event) => <EventRow key={event.id} event={event} />)}</section>)}{!loading && !error && cursor && <button type="button" disabled={loadingMore} onClick={() => void load(true)} className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50">{loadingMore ? 'Loading…' : 'Load more'}</button>}</div>
  </div>;
};
