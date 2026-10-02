import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, Check, ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw, Search, UserRoundCog, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { delegationService } from '../features/delegations/delegationService';
import { DelegationError } from '../features/delegations/delegationTypes';
import type { DelegationCandidate, DelegationDirection, DelegationPage, DelegationRecord, DelegationScope } from '../features/delegations/delegationTypes';
import { DELEGATION_PAGE_SIZE } from '../features/delegations/delegationRepository';

type Tab = 'created' | 'received' | 'history';
const dateLabel = (value: string) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const scopeOptions: Array<{ value: DelegationScope; label: string }> = [
  { value: 'all', label: 'All current and past' }, { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' }, { value: 'history', label: 'History' },
];
const statusClass: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

function DelegationCard({
  record, direction, isSelected, actPending, onAct, onCancel,
}: {
  record: DelegationRecord;
  direction: 'created' | 'received' | 'history';
  isSelected: boolean;
  actPending: boolean;
  onAct: () => void;
  onCancel: () => void;
}) {
  const { currentUser } = useApp();
  const own = direction === 'created';
  const otherName = own ? record.delegateName : record.delegatorName;
  const canCancel = own && (record.status === 'active' || record.status === 'scheduled');
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900">{own ? 'Delegated to' : 'Delegated by'} {otherName}</p>
        <p className="mt-1 text-xs text-slate-500">{own ? record.delegateRoleName : record.delegatorRoleName}{!own && ` · ${currentUser.name} remains ${currentUser.role}`}</p>
      </div>
      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${statusClass[record.status] ?? statusClass.expired}`}>{record.status}</span>
    </div>
    <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
      <div><span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Authority</span><span className="mt-1 block font-semibold text-slate-700">{record.authorityRoleName}</span></div>
      <div><span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Starts</span><span className="mt-1 block text-slate-700">{dateLabel(record.startAt)}</span></div>
      <div><span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ends</span><span className="mt-1 block text-slate-700">{dateLabel(record.endAt)}</span></div>
    </div>
    {own && record.reason && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span className="font-semibold">Reason:</span> {record.reason}</p>}
    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
      {!own && !currentUser.roleProtected && record.status === 'active' && <button type="button" onClick={onAct} disabled={isSelected || actPending} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-default disabled:bg-emerald-600">
        {isSelected ? <><Check className="mr-1 inline h-3.5 w-3.5" />Acting as {record.authorityRoleName}</> : actPending ? 'Selecting authority…' : `Act as ${record.authorityRoleName}`}
      </button>}
      {canCancel && <button type="button" onClick={onCancel} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Cancel delegation</button>}
    </div>
  </article>;
}

function CreateDelegationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { currentUser, authorityContext, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<DelegationCandidate[]>([]);
  const [candidatePage, setCandidatePage] = useState(0);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [selected, setSelected] = useState<DelegationCandidate | null>(null);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [reason, setReason] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const request = ++requestId.current;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingCandidates(true);
      try {
        const result = await delegationService.listCandidates(search, candidatePage * DELEGATION_PAGE_SIZE);
        if (!cancelled && request === requestId.current) {
          setCandidates(result.rows.filter((candidate) => candidate.userId !== currentUser.id));
          setTotalCandidates(result.totalCount);
        }
      } catch {
        if (!cancelled && request === requestId.current) setError('Unable to load delegation candidates. Please try again.');
      } finally {
        if (!cancelled && request === requestId.current) setLoadingCandidates(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search, candidatePage, currentUser.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null);
    if (!selected) return setError('Choose an active user to receive this delegation.');
    if (!startAt || !endAt) return setError('Choose both a start and end date and time.');
    const start = new Date(startAt); const end = new Date(endAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return setError('The end date and time must be after the start.');
    if (reason.length > 500) return setError('Reason must be 500 characters or fewer.');
    setSaving(true);
    try {
      await delegationService.create(selected.userId, start.toISOString(), end.toISOString(), reason);
      showToast('Delegation created.', 'success'); onCreated(); onClose();
    } catch (cause) {
      setError(cause instanceof DelegationError ? cause.message : 'We could not create this delegation. Please try again.');
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <form role="dialog" aria-modal="true" aria-labelledby="create-delegation-title" onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6"><div><h2 id="create-delegation-title" className="text-lg font-bold text-slate-900">Create Delegation</h2><p className="mt-1 text-xs text-slate-500">Temporarily delegate your own authority. Your account and role will not change.</p></div><button type="button" aria-label="Close" disabled={saving} onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></header>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900"><span className="font-semibold">Your authority:</span> {authorityContext?.mode === 'own' ? authorityContext.authority.roleName : currentUser.role} <span className="text-indigo-700">(read-only)</span></div>
        <div><label htmlFor="delegation-candidate-search" className="mb-1.5 block text-xs font-semibold text-slate-700">Delegate to</label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="delegation-candidate-search" value={search} onChange={(event) => { setSearch(event.target.value); setCandidatePage(0); setCandidates([]); setLoadingCandidates(true); setSelected(null); }} placeholder="Search active users by name or profile code" className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none" /></div>
          <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200" aria-label="Delegation candidates">{loadingCandidates ? <p className="p-4 text-center text-xs text-slate-500"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Searching…</p> : candidates.length ? candidates.map((candidate) => <button type="button" key={candidate.userId} onClick={() => setSelected(candidate)} className={`flex w-full items-center justify-between border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-indigo-50 ${selected?.userId === candidate.userId ? 'bg-indigo-50' : ''}`}><span><span className="block text-xs font-semibold text-slate-800">{candidate.fullName}</span><span className="block text-[10px] text-slate-500">{candidate.profileCode ? `${candidate.profileCode} · ` : ''}{candidate.roleName}{candidate.email ? ` · ${candidate.email}` : ''}</span></span>{selected?.userId === candidate.userId && <Check className="h-4 w-4 text-indigo-600" />}</button>) : <p className="p-4 text-center text-xs text-slate-500">No active users found.</p>}</div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>{selected ? `Selected: ${selected.fullName}` : 'Select one person'}</span><span className="flex gap-2"><button type="button" aria-label="Previous candidates" disabled={candidatePage === 0 || loadingCandidates} onClick={() => setCandidatePage((page) => Math.max(0, page - 1))} className="rounded border px-1.5 py-0.5 disabled:opacity-40">‹</button><span>{candidatePage + 1} / {Math.max(1, Math.ceil(totalCandidates / DELEGATION_PAGE_SIZE))}</span><button type="button" aria-label="Next candidates" disabled={(candidatePage + 1) * DELEGATION_PAGE_SIZE >= totalCandidates || loadingCandidates} onClick={() => setCandidatePage((page) => page + 1)} className="rounded border px-1.5 py-0.5 disabled:opacity-40">›</button></span></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Start date and time<input required type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">End date and time<input required type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label></div>
        <label className="block text-xs font-semibold text-slate-700">Reason <span className="font-normal text-slate-400">(optional)</span><textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="Vacation, leave, or other" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /><span className="mt-1 block text-right text-[10px] font-normal text-slate-400">{reason.length}/500</span></label>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Cancel</button><button type="submit" disabled={saving || !selected} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Creating…' : 'Create Delegation'}</button></footer>
    </form>
  </div>;
}

function CancelDelegationModal({ record, onClose, onConfirm }: { record: DelegationRecord; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false);
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4"><form role="dialog" aria-modal="true" aria-labelledby="cancel-delegation-title" onSubmit={async (event) => { event.preventDefault(); setSaving(true); await onConfirm(reason); setSaving(false); }} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h2 id="cancel-delegation-title" className="text-base font-bold text-slate-900">Cancel delegation?</h2><p className="mt-2 text-xs leading-5 text-slate-600">Authority for {record.delegateName} will stop according to the backend immediately. This record remains in history.</p><label className="mt-4 block text-xs font-semibold text-slate-700">Reason <span className="font-normal text-slate-400">(optional)</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border px-4 py-2 text-xs font-semibold">Keep delegation</button><button type="submit" disabled={saving} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Cancelling…' : 'Cancel delegation'}</button></div></form></div>;
}

export const DelegationsPage: React.FC = () => {
  const { currentUser, authorityContextStatus, authorityContext, isDelegatedMode, selectDelegationContext, clearDelegationContext, revalidateAuthorityContext, showToast } = useApp();
  const [tab, setTab] = useState<Tab>('created');
  const [scope, setScope] = useState<DelegationScope>('all');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<DelegationPage<DelegationRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<DelegationRecord | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);
  const direction: DelegationDirection = tab === 'history' ? 'all' : tab;
  const effectiveScope = tab === 'history' ? 'history' : scope;

  useEffect(() => {
    const request = ++requestId.current;
    let cancelled = false;
    setLoading(true); setError(null);
    void delegationService.listMine(direction, effectiveScope, page * DELEGATION_PAGE_SIZE).then((data) => {
      if (!cancelled && request === requestId.current) setResult(data);
    }).catch(() => {
      if (!cancelled && request === requestId.current) { setError('Unable to load delegations. Please try again.'); setResult(null); }
    }).finally(() => { if (!cancelled && request === requestId.current) setLoading(false); });
    return () => { cancelled = true; };
  }, [direction, effectiveScope, page, revision]);

  const refresh = () => setRevision((value) => value + 1);
  const activeContextId = isDelegatedMode ? authorityContext?.delegation?.delegationId : null;
  const actAs = async (record: DelegationRecord) => {
    setPendingId(record.id);
    await selectDelegationContext(record.id);
    setPendingId(null);
    refresh();
  };
  const returnToOwn = async () => {
    setPendingId('clear-context');
    if (await clearDelegationContext()) showToast('Returned to your own role.', 'success');
    setPendingId(null); refresh();
  };
  const cancel = async (reason: string) => {
    if (!cancelTarget) return;
    setPendingId(cancelTarget.id);
    try {
      await delegationService.cancel(cancelTarget.id, reason);
      showToast('Delegation cancelled. History has been preserved.', 'success');
      setCancelTarget(null); refresh(); await revalidateAuthorityContext();
    } catch (cause) {
      showToast(cause instanceof DelegationError ? cause.message : 'We could not cancel this delegation.', 'warning');
    } finally { setPendingId(null); }
  };

  const tabs: Array<[Tab, string]> = [['created', 'Delegations I Created'], ['received', 'Delegated to Me'], ['history', 'History']];
  return <div className="space-y-5 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><UserRoundCog className="h-6 w-6 text-indigo-600" />Delegations</h1><p className="mt-1 text-sm text-slate-500">Temporary authority, while every person keeps their own account and role.</p></div><div className="flex gap-2"><button type="button" onClick={refresh} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw className="mr-1 inline h-3.5 w-3.5" />Refresh</button>{authorityContextStatus === 'ready' && authorityContext?.mode === 'own' && currentUser.status === 'Active' && !currentUser.roleProtected && <button type="button" onClick={() => setCreateOpen(true)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"><Plus className="mr-1 inline h-4 w-4" />Create Delegation</button>}</div></header>
    {authorityContextStatus === 'loading' && <div role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Verifying your authority context…</div>}
    {authorityContextStatus === 'error' && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">We couldn't verify the current authority context. Delegation actions are temporarily unavailable.</div>}
    {isDelegatedMode && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Acting as {authorityContext?.authority.roleName}</p><p className="mt-1 text-xs text-indigo-900">On behalf of {authorityContext?.delegation?.delegatedByName}. You remain {currentUser.name} — {currentUser.role}.</p></div><button type="button" disabled={pendingId === 'clear-context'} onClick={() => void returnToOwn()} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-50">{pendingId === 'clear-context' ? 'Switching…' : 'Return to My Role'}</button></div>}
    <div className="border-b border-slate-200"><nav role="tablist" aria-label="Delegation lists" className="flex flex-wrap gap-1">{tabs.map(([key, label]) => <button type="button" role="tab" key={key} onClick={() => { setPage(0); setTab(key); }} aria-selected={tab === key} className={`border-b-2 px-3 py-3 text-xs font-semibold ${tab === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}</nav></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs text-slate-500"><CalendarClock className="h-4 w-4" />Status is supplied by the server and authority expires automatically.</p>{tab !== 'history' && <label className="text-xs font-semibold text-slate-600">Show <select value={scope} onChange={(event) => { setPage(0); setScope(event.target.value as DelegationScope); }} className="ml-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2">{scopeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}</div>
    {loading ? <div role="status" className="rounded-xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline h-5 w-5 animate-spin" />Loading delegations…</div> : error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : !result?.rows.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500">No delegations in this view.</div> : <div className="space-y-3">{result.rows.map((record) => <DelegationCard key={record.id} record={record} direction={tab} isSelected={activeContextId === record.id} actPending={Boolean(pendingId)} onAct={() => void actAs(record)} onCancel={() => setCancelTarget(record)} />)}</div>}
    {result && result.totalCount > DELEGATION_PAGE_SIZE && <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"><span className="text-xs text-slate-500">Page {page + 1} · {result.totalCount} delegations</span><div className="flex gap-2"><button type="button" disabled={page === 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40"><ChevronLeft className="inline h-3.5 w-3.5" />Previous</button><button type="button" disabled={(page + 1) * DELEGATION_PAGE_SIZE >= result.totalCount || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Next<ChevronRight className="ml-1 inline h-3.5 w-3.5" /></button></div></div>}
    {createOpen && <CreateDelegationModal onClose={() => setCreateOpen(false)} onCreated={() => { refresh(); void revalidateAuthorityContext(); }} />}
    {cancelTarget && <CancelDelegationModal record={cancelTarget} onClose={() => { if (!pendingId) setCancelTarget(null); }} onConfirm={cancel} />}
  </div>;
};
