import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, UsersRound } from 'lucide-react';
import { delegationService } from '../../features/delegations/delegationService';
import type { DelegationPage, DelegationRecord, DelegationScope } from '../../features/delegations/delegationTypes';
import { DELEGATION_PAGE_SIZE } from '../../features/delegations/delegationRepository';

const scopes: Array<[DelegationScope, string]> = [['active', 'Active'], ['scheduled', 'Scheduled'], ['history', 'History'], ['all', 'All']];
const dateRange = (start: string, end: string) => `${new Date(start).toLocaleDateString([], { dateStyle: 'medium' })} – ${new Date(end).toLocaleDateString([], { dateStyle: 'medium' })}`;

export const OrganizationDelegationsPanel: React.FC = () => {
  const [scope, setScope] = useState<DelegationScope>('active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<DelegationPage<DelegationRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const request = ++requestId.current; setLoading(true); setError(false);
    void delegationService.listOrganization(scope, search, page * DELEGATION_PAGE_SIZE).then((data) => {
      if (!cancelled && request === requestId.current) setResult(data);
    }).catch(() => { if (!cancelled && request === requestId.current) { setError(true); setResult(null); } })
      .finally(() => { if (!cancelled && request === requestId.current) setLoading(false); });
    return () => { cancelled = true; };
  }, [scope, search, page]);
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><UsersRound className="h-4 w-4 text-indigo-600" />Temporary Delegations</h2><p className="mt-1 text-xs text-slate-500">Organization-visible coverage; permanent roles and reporting lines are unchanged.</p></div><select aria-label="Delegation history scope" value={scope} onChange={(event) => { setScope(event.target.value as DelegationScope); setPage(0); }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs">{scopes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input type="search" aria-label="Search organization delegations" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search people or authority" className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs sm:max-w-sm" /></div>
    {loading ? <p role="status" className="py-6 text-center text-xs text-slate-500"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Loading delegations…</p> : error ? <p role="alert" className="py-6 text-center text-xs text-rose-700">Organization delegations could not be loaded.</p> : !result?.rows.length ? <p className="py-6 text-center text-xs text-slate-500">No delegations in this view.</p> : <div className="mt-3 divide-y divide-slate-100">{result.rows.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-xs font-semibold text-slate-800">{item.delegatorName} <span className="font-normal text-slate-500">({item.delegatorRoleName})</span> <span className="text-slate-400">delegated to</span> {item.delegateName} <span className="font-normal text-slate-500">({item.delegateRoleName})</span></p><p className="mt-1 text-[10px] text-slate-500">{item.authorityRoleName} authority · {dateRange(item.startAt, item.endAt)}</p></div><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold capitalize text-slate-600">{item.status}</span></article>)}</div>}
    {result && result.totalCount > DELEGATION_PAGE_SIZE && <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-[10px] text-slate-500">Page {page + 1} of {Math.max(1, Math.ceil(result.totalCount / DELEGATION_PAGE_SIZE))}</span><div className="flex gap-2"><button type="button" aria-label="Previous delegations" disabled={!page || loading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded border px-2 py-1 text-xs disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button><button type="button" aria-label="Next delegations" disabled={(page + 1) * DELEGATION_PAGE_SIZE >= result.totalCount || loading} onClick={() => setPage((value) => value + 1)} className="rounded border px-2 py-1 text-xs disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button></div></div>}
  </section>;
};
