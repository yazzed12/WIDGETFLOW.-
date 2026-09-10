import React, { useRef, useState } from 'react';
import { AlertTriangle, LockKeyhole } from 'lucide-react';
import { adminDataControlService } from '../../../../features/admin/services/adminDataControlService';

interface SystemResetExplorerProps {
  onRefresh?: () => void | Promise<void>;
}

export const SystemResetExplorer: React.FC<SystemResetExplorerProps> = ({ onRefresh }) => {
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [executeLocked, setExecuteLocked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [deleteUserAccounts, setDeleteUserAccounts] = useState(false);
  const executeLockRef = useRef(false);

  const review = async () => {
    if (busy || completed) return;
    setBusy(true);
    setMessage(null);
    try {
      setPreview(await adminDataControlService.previewFactoryReset({ delete_user_accounts: deleteUserAccounts }));
      setCompleted(false);
      setConfirmation('');
      executeLockRef.current = false;
      setExecuteLocked(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to load reset preview.');
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    // The ref closes the race between two clicks before React re-renders.
    if (executeLockRef.current || busy || completed || confirmation !== 'RESET WIDGETFLOW DATA') return;
    executeLockRef.current = true;
    setExecuteLocked(true);
    setBusy(true);
    setMessage(null);
    try {
      setPreview(await adminDataControlService.executeFactoryReset(confirmation, { delete_user_accounts: deleteUserAccounts }));
      setCompleted(true);
      setConfirmation('');
      setMessage('System reset completed.');
      await onRefresh?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'System reset failed.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
    <div className="rounded-3xl border border-red-200 bg-red-50/70 p-6 md:p-8"><div className="flex items-start gap-4"><div className="p-3 rounded-2xl bg-red-100 text-red-700"><AlertTriangle className="w-6 h-6" /></div><div><h1 className="text-xl font-black text-slate-900 tracking-tight">System Reset</h1><p className="text-sm text-slate-600 mt-1">Reset WidgetFlow application data to a clean operational state.</p></div></div></div>
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4"><h2 className="text-sm font-black text-slate-900">Review System Reset</h2><p className="text-xs text-slate-600">The Protected Admin, security foundations, configuration, audit history, and database schema are preserved.</p><label className="flex items-start gap-3 text-xs font-bold text-slate-700"><input type="checkbox" checked={deleteUserAccounts} disabled={busy || completed} onChange={(e) => setDeleteUserAccounts(e.target.checked)} className="mt-0.5 rounded" /> <span>Also delete all non-Admin user accounts</span></label>{deleteUserAccounts && <p className="text-xs font-semibold text-red-700">This will permanently remove non-Admin login access. Historical identity records remain preserved.</p>}<div className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-4"><LockKeyhole className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /><p className="text-xs text-slate-600">Storage cleanup is coordinated server-side and may require reconciliation if an external object cannot be verified.</p></div><button type="button" disabled={busy || completed} onClick={() => void review()} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold disabled:opacity-50">{busy ? 'Loading preview…' : 'Review Reset'}</button></div>
    {preview && <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4"><h2 className="text-sm font-black text-slate-900">System Reset Review</h2>{(() => { const purge = (preview.account_purge ?? {}) as Record<string, unknown>; const business = (preview.business_data ?? {}) as Record<string, unknown>; return <div className="space-y-3 text-xs"><div><h3 className="font-black text-slate-700 uppercase tracking-wide">Business Data</h3><p className="text-slate-600 mt-1">Authoritative business-data cleanup is enabled.</p><p className="text-slate-600">Accounts currently represented: {Number((business.accounts as any)?.count ?? 0)}</p></div><div><h3 className="font-black text-slate-700 uppercase tracking-wide">Accounts</h3><p className="text-slate-600 mt-1">{Number(purge.auth_users_to_delete ?? 0)} user accounts lose login access; {Number(purge.profiles_to_archive ?? 0)} historical identities are preserved.</p><p className="font-semibold text-emerald-700">Protected Admin: preserved</p></div><div><h3 className="font-black text-slate-700 uppercase tracking-wide">Storage</h3><p className="text-slate-600 mt-1">Storage cleanup is reconciled server-side before completion.</p></div><div><h3 className="font-black text-slate-700 uppercase tracking-wide">Preserved Foundations</h3><p className="text-slate-600 mt-1">Roles, permissions, governance, configuration, RLS, audit history, schema, and reset ledger remain preserved.</p></div></div>; })()}{completed ? <p className="text-xs font-bold text-emerald-700">Reset completed. This confirmation is locked.</p> : <><label className="block text-xs font-bold text-slate-700">Type RESET WIDGETFLOW DATA to execute<input value={confirmation} disabled={executeLocked || busy} onChange={(e) => setConfirmation(e.target.value)} className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs disabled:bg-slate-100" /></label><button type="button" disabled={executeLocked || busy || confirmation !== 'RESET WIDGETFLOW DATA'} onClick={() => void execute()} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold disabled:opacity-50">{busy ? 'Executing…' : 'Execute System Reset'}</button></> }<details><summary className="cursor-pointer text-xs font-semibold text-slate-500">Advanced Details</summary><pre className="mt-2 p-4 rounded-2xl bg-slate-900 text-slate-200 text-[11px] overflow-auto">{JSON.stringify(preview, null, 2)}</pre></details></div>}
    {message && <p className="text-xs font-semibold text-slate-700">{message}</p>}
  </div>;
};
