import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { canAccessInsights } from '../../features/insights/templateInsightsAccess';

interface DeleteTemplateActionProps {
  template: { id: string; name: string; status: string; templateDisplayId?: string | null; version?: string | null };
  compact?: boolean;
  onArchived?: (templateId: string) => void;
  customTrigger?: (onClick: (event: React.MouseEvent) => void) => ReactNode;
}

export const DeleteTemplateAction: React.FC<DeleteTemplateActionProps> = ({ template, compact = false, onArchived, customTrigger }) => {
  const { insightsAccess, archiveTemplate, refreshInsightsAccess, showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) {
        setOpen(false);
        setReason('');
        setError(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, pending]);

  if (!canAccessInsights(insightsAccess) || template.status.toLowerCase() === 'archived') return null;

  const openConfirmation = (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpen(true);
  };

  const close = () => {
    if (pending) return;
    setOpen(false);
    setReason('');
    setError(null);
  };

  const confirm = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await archiveTemplate(template.id, reason.trim());
      onArchived?.(template.id);
      setOpen(false);
    } catch {
      const stillAllowed = await refreshInsightsAccess();
      if (stillAllowed === false) {
        showToast('Your access to Insights has changed.', 'warning');
      } else {
        setError("We couldn't delete this Template. Please try again.");
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  return <>
    {customTrigger ? customTrigger(openConfirmation) : <button
      type="button"
      onClick={openConfirmation}
      aria-label={`Delete Template ${template.name}`}
      title="Delete Template"
      className={compact
        ? 'rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500'
        : 'inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500'}
    >
      <Trash2 className="h-4 w-4" />{!compact && <span>Delete Template</span>}
    </button>}

    {open && <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="delete-template-title" className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div>
            <h2 id="delete-template-title" className="text-lg font-bold text-slate-900">Delete Template?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">This Template will be removed from active use. Existing Reports, Template versions, usage history, and audit history will be preserved.</p>
          </div>
          <button type="button" onClick={close} disabled={pending} aria-label="Close delete confirmation" className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"><X className="h-4 w-4" /></button>
        </header>

        <div className="space-y-4 p-5 sm:p-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <dt className="font-semibold text-slate-500">Template</dt><dd className="min-w-0 break-words font-semibold text-slate-900">{template.name}</dd>
            {template.templateDisplayId && <><dt className="font-semibold text-slate-500">Display ID</dt><dd className="font-mono text-slate-700">{template.templateDisplayId}</dd></>}
            {template.version && <><dt className="font-semibold text-slate-500">Version</dt><dd className="text-slate-700">{template.version}</dd></>}
            <dt className="font-semibold text-slate-500">Status</dt><dd className="text-slate-700">{template.status}</dd>
          </dl>

          <label className="block text-xs font-semibold text-slate-700" htmlFor="delete-template-reason">Reason for deletion <span className="font-normal text-slate-400">(optional)</span>
            <textarea id="delete-template-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} rows={3} disabled={pending} placeholder="Add a short reason, if helpful" className="mt-1.5 block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100" />
            <span className="mt-1 block text-right text-[10px] font-normal text-slate-400">{reason.length}/500</span>
          </label>

          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} disabled={pending} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
          <button type="button" onClick={() => void confirm()} disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
            {pending && <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {pending ? 'Deleting…' : 'Delete Template'}
          </button>
        </footer>
      </section>
    </div>}
  </>;
};
