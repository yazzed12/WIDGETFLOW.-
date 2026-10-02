import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, ShieldAlert } from 'lucide-react';
import { delegationService } from '../../features/delegations/delegationService';
import { DelegationError } from '../../features/delegations/delegationTypes';
import type { DelegationPage, DelegationRecord, DelegationScope } from '../../features/delegations/delegationTypes';
import { DELEGATION_PAGE_SIZE } from '../../features/delegations/delegationRepository';
import { useApp } from '../../context/AppContext';

const scopes: Array<[DelegationScope, string]> = [['active', 'Active'], ['scheduled', 'Scheduled'], ['history', 'History'], ['all', 'All']];
const dateLabel = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export const AdminDelegations: React.FC = () => {
  const { showToast } = useApp();
  const [scope, setScope] = useState<DelegationScope>('active');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<DelegationPage<DelegationRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [target, setTarget] = useState<DelegationRecord | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const requestId = useRef(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const request = ++requestId.current; setLoading(true); setError(false);
    void delegationService.listAdmin(scope, search, page * DELEGATION_PAGE_SIZE).then((data) => { if (!cancelled && request === requestId.current) setResult(data); })
      .catch(() => { if (!cancelled && request === requestId.current) { setError(true); setResult(null); } })
      .finally(() => { if (!cancelled && request === requestId.current) setLoading(false); });
    return () => { cancelled = true; };
  }, [scope, search, page, revision]);
  const cancel = async (event: React.FormEvent) => {
    event.preventDefault(); if (!target || !reason.trim() || pending) return;
    setPending(true);
    try { await delegationService.adminCancel(target.id, reason.trim()); showToast('Delegation emergency-cancelled. History was preserved.', 'success'); setTarget(null); setReason(''); setRevision((value) => value + 1); }
    catch (cause) { showToast(cause instanceof DelegationError ? cause.message : 'We could not cancel this delegation.', 'warning'); }
    finally { setPending(false); }
  };
  return <div className="space-y-5 p-5 sm:p-6">
    <header><h2 className="text-xl font-bold text-slate-900">Delegation Oversight</h2><p className="mt-1 text-xs text-slate-500">Organization-wide delegation records. Emergency cancellation preserves history.</p></header>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"><div className="relative min-w-[16rem] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} type="search" aria-label="Search delegations" placeholder="Search delegator, delegate, or authority" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs" /></div><label className="text-xs font-semibold text-slate-600">Scope <select value={scope} onChange={(event) => { setScope(event.target.value as DelegationScope); setPage(0); }} className="ml-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2">{scopes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {loading ? <div role="status" className="rounded-xl border bg-white py-14 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline h-5 w-5 animate-spin" />Loading delegations…</div> : error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">Unable to load the delegation directory.</p> : !result?.rows.length ? <p className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500">No delegation records found.</p> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{result.rows.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0"><div><p className="text-xs font-bold text-slate-900">{item.delegatorName} <span className="font-normal text-slate-500">({item.delegatorRoleName})</span> <span className="font-normal text-slate-400">→</span> {item.delegateName} <span className="font-normal text-slate-500">({item.delegateRoleName})</span></p><p className="mt-1 text-[11px] text-slate-600">{item.authorityRoleName} · {dateLabel(item.startAt)} – {dateLabel(item.endAt)} · <span className="capitalize">{item.status}</span></p>{item.reason && <p className="mt-1 text-[10px] text-slate-500">Reason: {item.reason}</p>}</div>{(item.status === 'active' || item.status === 'scheduled') && <button type="button" onClick={() => { setTarget(item); setReason(''); }} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><ShieldAlert className="mr-1 inline h-3.5 w-3.5" />Emergency Cancel</button>}</article>)}</div>}
    {result && result.totalCount > DELEGATION_PAGE_SIZE && <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"><span className="text-xs text-slate-500">Page {page + 1} · {result.totalCount} records</span><div className="flex gap-2"><button type="button" disabled={!page || loading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"><ChevronLeft className="inline h-3.5 w-3.5" />Previous</button><button type="button" disabled={(page + 1) * DELEGATION_PAGE_SIZE >= result.totalCount || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Next<ChevronRight className="ml-1 inline h-3.5 w-3.5" /></button></div></div>}
    {target && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4"><form role="dialog" aria-modal="true" aria-labelledby="admin-delegation-cancel-title" onSubmit={cancel} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h3 id="admin-delegation-cancel-title" className="text-base font-bold text-slate-900">Emergency cancel delegation</h3><p className="mt-2 text-xs leading-5 text-slate-600">Access stops immediately. The delegation and its history will not be deleted.</p><label className="mt-4 block text-xs font-semibold text-slate-700">Cancellation reason<textarea required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={pending} onClick={() => setTarget(null)} className="rounded-lg border px-4 py-2 text-xs font-semibold">Keep active</button><button type="submit" disabled={pending || !reason.trim()} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending ? 'Cancelling…' : 'Confirm cancellation'}</button></div></form></div>}
  </div>;
};
