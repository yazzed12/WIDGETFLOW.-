import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, ShieldCheck } from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService';
import type { FeatureAccessPage, FeatureRoleAccessRow, FeatureUserAccessRow, FeatureUserOverride } from '../../features/insights/featureAccessTypes';

const PAGE_SIZE = 25;
type Tab = 'roles' | 'users';

function accessLabel(allowed: boolean, inactive = false): string {
  if (inactive) return 'Inactive';
  return allowed ? 'Allowed' : 'Denied';
}

function AccessPill({ allowed, inactive = false }: { allowed: boolean; inactive?: boolean }) {
  const label = accessLabel(allowed, inactive);
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${inactive ? 'bg-slate-100 text-slate-600' : allowed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{label}</span>;
}

export const InsightsAccessManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tab, setTab] = useState<Tab>('roles');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [rolePage, setRolePage] = useState<FeatureAccessPage<FeatureRoleAccessRow> | null>(null);
  const [userPage, setUserPage] = useState<FeatureAccessPage<FeatureUserAccessRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());
  const [revokeRole, setRevokeRole] = useState<FeatureRoleAccessRow | null>(null);
  const requestSequence = useRef(0);
  const pendingMutations = useRef(new Set<string>());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    let current = true;
    setLoading(true);
    setError(null);
    const request = tab === 'roles'
      ? adminService.featureRoleAccess(search, PAGE_SIZE, offset)
      : adminService.featureUserAccess(search, PAGE_SIZE, offset);
    request.then((page) => {
      if (!current || sequence !== requestSequence.current) return;
      if (tab === 'roles') setRolePage(page as FeatureAccessPage<FeatureRoleAccessRow>);
      else setUserPage(page as FeatureAccessPage<FeatureUserAccessRow>);
    }).catch(() => {
      if (!current || sequence !== requestSequence.current) return;
      setError(tab === 'roles' ? "We couldn't load Role access. Please try again." : "We couldn't load User access. Please try again.");
    }).finally(() => {
      if (current && sequence === requestSequence.current) setLoading(false);
    });
    return () => { current = false; };
  }, [tab, search, offset, retry]);

  const activePage = tab === 'roles' ? rolePage : userPage;
  const pagination = activePage?.pagination;
  const total = pagination?.total ?? 0;
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + PAGE_SIZE, total);

  const mutateRole = async (role: FeatureRoleAccessRow, allowed: boolean) => {
    const key = `role:${role.roleId}`;
    if (pendingMutations.current.has(key) || !role.configurable || !role.isActive) return;
    pendingMutations.current.add(key);
    setPendingKeys(new Set(pendingMutations.current));
    setError(null);
    try {
      await adminService.setFeatureRoleAccess(role.roleId, allowed);
      setRevokeRole(null);
      setRetry((value) => value + 1);
    } catch {
      setError("We couldn't update Insights access for this Role.");
    } finally {
      pendingMutations.current.delete(key);
      setPendingKeys(new Set(pendingMutations.current));
    }
  };

  const mutateUser = async (user: FeatureUserAccessRow, override: FeatureUserOverride) => {
    const key = `user:${user.userId}`;
    if (pendingMutations.current.has(key) || !user.configurable || user.protectedAdmin || user.status.toLowerCase() !== 'active' || !user.roleActive) return;
    pendingMutations.current.add(key);
    setPendingKeys(new Set(pendingMutations.current));
    setError(null);
    try {
      await adminService.setFeatureUserOverride(user.userId, override);
      setRetry((value) => value + 1);
    } catch {
      setError("We couldn't update Insights access for this user.");
    } finally {
      pendingMutations.current.delete(key);
      setPendingKeys(new Set(pendingMutations.current));
    }
  };

  return <div className="space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="flex items-start gap-3"><button type="button" onClick={onBack} aria-label="Back to Feature Management" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"><ArrowLeft className="h-4 w-4"/></button><div><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-indigo-600"/><h1 className="text-lg font-bold text-slate-900">Insights Access</h1></div><p className="mt-1 text-xs text-slate-500">Control which roles and individual users can access organization Insights.</p></div></div>
    </header>

    <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs">
      <p><span className="font-semibold text-slate-700">Protected Admin:</span> <span className="font-semibold text-emerald-700">Always Allowed</span></p>
      <p><span className="font-semibold text-slate-700">Access model:</span> <span className="text-slate-600">Role grants + individual overrides</span></p>
    </section>
    {tab === 'users' && <p className="text-[10px] leading-relaxed text-slate-500">Inherit uses the person’s Role access. Allow grants individual access; Deny blocks access even when the Role is allowed.</p>}

    <div className="flex flex-col gap-3 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between">
      <div role="tablist" aria-label="Insights access directory" className="flex gap-1">
        {(['roles', 'users'] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setOffset(0); }} className={`border-b-2 px-4 py-2 text-xs font-semibold capitalize focus:outline-none focus:ring-2 focus:ring-indigo-500 ${tab === value ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{value}</button>)}
      </div>
      <label className="relative mb-2 block w-full sm:mb-0 sm:w-72"><span className="sr-only">Search {tab}</span><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={tab === 'roles' ? 'Search roles' : 'Search users'} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"/></label>
    </div>

    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"><span>{error}</span><button type="button" onClick={() => setRetry((value) => value + 1)} className="font-semibold underline">Retry</button></div>}

    {tab === 'roles' ? <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs" aria-busy={loading}>
      <table className="min-w-[760px] w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Role</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Governance</th><th className="px-3 py-3">Members</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Insights Access</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{(rolePage?.items ?? []).map((role) => {
        const busy = pendingKeys.has(`role:${role.roleId}`);
        const immutable = !role.configurable || !role.isActive;
        return <tr key={role.roleId} className="hover:bg-slate-50"><td className="px-4 py-3"><span className="font-semibold text-slate-800">{role.roleName}</span>{role.isProtected && <span className="ml-2 text-[9px] text-slate-500">Protected</span>}</td><td className="px-3 py-3 text-slate-600">{role.roleType}</td><td className="px-3 py-3 text-slate-600">{role.governanceLevel ?? '—'}</td><td className="px-3 py-3 text-slate-600">{role.memberCount}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${role.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{role.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-3 py-3">{!role.isActive ? <AccessPill allowed={role.allowed} inactive/> : !role.configurable ? <span className="text-[10px] font-semibold text-emerald-700">Always Allowed</span> : <AccessPill allowed={role.allowed}/>}</td><td className="px-4 py-3 text-right">{!role.isActive ? <span className="text-[10px] text-slate-400">Inactive</span> : !role.configurable ? <span className="text-[10px] text-slate-400">Not configurable</span> : <button type="button" disabled={immutable || busy || loading} onClick={() => role.allowed ? setRevokeRole(role) : void mutateRole(role, true)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Saving…' : role.allowed ? 'Revoke Access' : 'Grant Access'}</button>}</td></tr>;
      })}</tbody></table>
      {loading && <output aria-live="polite" className="block px-4 py-3 text-[11px] text-slate-500">Loading role access…</output>}
      {!loading && !error && rolePage?.items.length === 0 && <p className="p-8 text-center text-xs text-slate-500">No roles match this search.</p>}
    </div> : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs" aria-busy={loading}>
      <table className="min-w-[1050px] w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-3 py-3">Profile ID</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Role Access</th><th className="px-3 py-3">Override</th><th className="px-3 py-3">Effective Access</th><th className="px-3 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{(userPage?.items ?? []).map((user) => {
        const busy = pendingKeys.has(`user:${user.userId}`);
        const inactive = user.status.toLowerCase() !== 'active' || !user.roleActive;
        const immutable = !user.configurable || user.protectedAdmin || inactive;
        return <tr key={user.userId} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="font-semibold text-slate-800">{user.fullName}</div>{user.email && <div className="mt-0.5 text-[10px] text-slate-500">{user.email}</div>}</td><td className="px-3 py-3 font-mono text-[10px] text-slate-600">{user.profileCode ?? '—'}</td><td className="px-3 py-3 text-slate-600">{user.roleName ?? '—'}</td><td className="px-3 py-3"><AccessPill allowed={user.roleAllowed} inactive={inactive}/></td><td className="px-3 py-3">{inactive ? <AccessPill allowed={false} inactive/> : user.protectedAdmin ? <span className="text-[10px] font-semibold text-emerald-700">Always Allowed</span> : <span className="capitalize text-slate-700">{user.override}</span>}</td><td className="px-3 py-3">{user.protectedAdmin && !inactive ? <AccessPill allowed/> : <AccessPill allowed={user.effectiveAllowed} inactive={inactive}/>}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${inactive ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{inactive ? `${user.status}${!user.roleActive ? ' · role inactive' : ''}` : 'Active'}</span></td><td className="px-4 py-3">{inactive ? <span className="text-[10px] text-slate-400">Inactive</span> : user.protectedAdmin ? <span className="text-[10px] font-semibold text-emerald-700">Always Allowed</span> : <><label className="sr-only" htmlFor={`insights-override-${user.userId}`}>Insights override for {user.fullName}</label><select id={`insights-override-${user.userId}`} value={user.override} disabled={immutable || busy || loading} onChange={(event) => void mutateUser(user, event.target.value as FeatureUserOverride)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60" title={immutable ? 'This account cannot be configured.' : 'Inherit uses the role grant; Allow grants individual access; Deny blocks access.'}><option value="inherit">Inherit</option><option value="allow">Allow</option><option value="deny">Deny</option></select></>}{busy && <span className="ml-2 text-[10px] text-slate-500">Saving…</span>}</td></tr>;
      })}</tbody></table>
      {loading && <output aria-live="polite" className="block px-4 py-3 text-[11px] text-slate-500">Loading user access…</output>}
      {!loading && !error && userPage?.items.length === 0 && <p className="p-8 text-center text-xs text-slate-500">No users match this search.</p>}
    </div>}

    <footer className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500"><span>Showing {start}–{end} of {total} {tab}</span><div className="flex items-center gap-2"><button type="button" disabled={offset === 0 || loading} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5"/>Previous</button><span>Page {total ? Math.floor(offset / PAGE_SIZE) + 1 : 0} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span><button type="button" disabled={offset + PAGE_SIZE >= total || loading} onClick={() => setOffset((value) => value + PAGE_SIZE)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next<ChevronRight className="h-3.5 w-3.5"/></button></div></footer>

    {revokeRole && <div role="presentation" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pendingKeys.has(`role:${revokeRole.roleId}`)) setRevokeRole(null); }}><section role="dialog" aria-modal="true" aria-labelledby="revoke-insights-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"><h2 id="revoke-insights-title" className="text-base font-bold text-slate-900">Revoke Insights access?</h2><p className="mt-2 text-xs leading-relaxed text-slate-600">Users who inherit access from this Role will no longer be able to access Insights. Individual user overrides may still affect their access.</p><dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-lg bg-slate-50 p-3 text-xs"><dt className="font-semibold text-slate-500">Role</dt><dd className="font-semibold text-slate-800">{revokeRole.roleName}</dd><dt className="font-semibold text-slate-500">Members</dt><dd className="text-slate-700">{revokeRole.memberCount}</dd></dl><footer className="mt-5 flex justify-end gap-2"><button type="button" disabled={pendingKeys.has(`role:${revokeRole.roleId}`)} onClick={() => setRevokeRole(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Cancel</button><button type="button" disabled={pendingKeys.has(`role:${revokeRole.roleId}`)} onClick={() => void mutateRole(revokeRole, false)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{pendingKeys.has(`role:${revokeRole.roleId}`) ? 'Saving…' : 'Revoke Access'}</button></footer></section></div>}
  </div>;
};
