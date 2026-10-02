import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Pause, Play, Edit3, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { templateInsightsService } from '../../features/insights/templateInsightsService';
import type { TemplateControlState, TemplateUsageRow } from '../../features/insights/templateInsightsTypes';
import { DeleteTemplateAction } from '../templates/DeleteTemplateAction';
import { canAccessInsights } from '../../features/insights/templateInsightsAccess';

interface Props {
  template: TemplateUsageRow;
  controlState: TemplateControlState | null;
  loading: boolean;
  onControlChange: (state: TemplateControlState) => void;
  onRefreshControlStates: () => void;
}

export const TemplateUsageActions: React.FC<Props> = ({ template, controlState, loading, onControlChange, onRefreshControlStates }) => {
  const { openAddTemplateModal, refreshTemplates, showToast, insightsAccess, refreshInsightsAccess } = useApp();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [dialog, setDialog] = useState<'pause' | 'resume' | 'revision' | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeMenu = () => setMenuOpen(false);
  const openMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (menuOpen) return closeMenu();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 170)), left: Math.max(8, Math.min(rect.right - 190, window.innerWidth - 198)) });
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node) || triggerRef.current?.contains(event.target as Node)) return;
      closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        triggerRef.current?.focus();
      }
    };
    const onScroll = () => closeMenu();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [menuOpen]);

  const openDialog = (next: 'pause' | 'resume' | 'revision') => {
    closeMenu();
    setError(null);
    setReason('');
    setDialog(next);
  };

  const closeDialog = () => {
    if (pending) return;
    setDialog(null);
    setReason('');
    setError(null);
  };

  const confirmPauseResume = async () => {
    if (!controlState || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      if (dialog === 'pause') {
        await templateInsightsService.pauseTemplate(template.templateId, reason.trim());
        onControlChange({ ...controlState, isPaused: true, pausedAt: new Date().toISOString(), pauseReason: reason.trim() || null });
        showToast('Template paused. It remains approved but cannot be used for new Reports.', 'success');
      } else {
        await templateInsightsService.resumeTemplate(template.templateId);
        onControlChange({ ...controlState, isPaused: false, pausedAt: null, pauseReason: null });
        showToast('Template resumed and is available for new Reports.', 'success');
      }
      setDialog(null);
      void refreshTemplates().catch(() => undefined);
      onRefreshControlStates();
    } catch {
      const stillAllowed = await refreshInsightsAccess();
      if (stillAllowed === false) {
        showToast('Your access to Insights has changed.', 'warning');
        return;
      }
      setError("We couldn't update this Template. Please try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const createRevision = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const draft = await templateInsightsService.createTemplateRevision(template.templateId);
      setDialog(null);
      openAddTemplateModal(draft);
      showToast('A Draft revision was created. The approved Template remains unchanged.', 'success');
    } catch {
      const stillAllowed = await refreshInsightsAccess();
      if (stillAllowed === false) {
        showToast('Your access to Insights has changed.', 'warning');
        return;
      }
      setError("We couldn't create a Draft revision for this Template. Please try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  if (!canAccessInsights(insightsAccess)) return null;

  return <>
    <button ref={triggerRef} type="button" onClick={openMenu} onKeyDown={(event) => { if (event.key === 'Escape') closeMenu(); }} aria-label={`Actions for ${template.templateName}`} aria-haspopup="menu" aria-expanded={menuOpen} disabled={loading || !controlState} title={loading ? 'Loading Template controls' : 'Template actions'} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-wait disabled:opacity-50"><MoreHorizontal className="h-4 w-4"/></button>
    {menuOpen && createPortal(<div ref={menuRef} role="menu" aria-label={`Actions for ${template.templateName}`} style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left }} className="z-[65] w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []); const index = items.indexOf(document.activeElement as HTMLElement); if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); items[(index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus(); } else if (event.key === 'Home') { event.preventDefault(); items[0]?.focus(); } else if (event.key === 'End') { event.preventDefault(); items.at(-1)?.focus(); } }}>
      <button type="button" role="menuitem" onClick={() => openDialog('revision')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"><Edit3 className="h-3.5 w-3.5"/>Edit Template</button>
      <button type="button" role="menuitem" onClick={() => openDialog(controlState?.isPaused ? 'resume' : 'pause')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">{controlState?.isPaused ? <Play className="h-3.5 w-3.5"/> : <Pause className="h-3.5 w-3.5"/>}{controlState?.isPaused ? 'Resume Template' : 'Pause Template'}</button>
      <DeleteTemplateAction template={{ id: template.templateId, name: template.templateName, status: template.status, templateDisplayId: template.templateDisplayId, version: template.currentVersion }} customTrigger={(onClick) => <button type="button" role="menuitem" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50 focus:bg-rose-50 focus:outline-none"><Trash2 className="h-3.5 w-3.5"/>Delete Template</button>} onArchived={closeMenu}/>
    </div>, document.body)}
    {dialog && <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="template-control-title" className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <h2 id="template-control-title" className="text-base font-bold text-slate-900">{dialog === 'pause' ? 'Pause Template?' : dialog === 'resume' ? 'Resume Template?' : 'Create Draft Revision?'}</h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">{dialog === 'pause' ? 'New Reports cannot be created from this Template while it is paused. Existing Reports and historical usage will remain unchanged.' : dialog === 'resume' ? 'This approved Template will be available for creating new Reports again.' : 'A new Draft revision will be created. The currently approved version will remain available until the revision is reviewed and approved.'}</p>
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs"><div className="font-semibold text-slate-800">{template.templateName}</div>{template.templateDisplayId && <div className="mt-1 font-mono text-[10px] text-slate-500">{template.templateDisplayId}</div>}<div className="mt-1 text-[10px] text-slate-500">Version {template.currentVersion ?? '—'}</div></div>
        {dialog === 'pause' && <label htmlFor="template-pause-reason" className="mt-4 block text-xs font-semibold text-slate-700">Reason <span className="font-normal text-slate-400">(optional)</span><textarea id="template-pause-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} rows={3} disabled={pending} className="mt-1.5 block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-xs font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100"/><span className="mt-1 block text-right text-[10px] font-normal text-slate-400">{reason.length}/500</span></label>}
        {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
        <footer className="mt-5 flex justify-end gap-2"><button type="button" onClick={closeDialog} disabled={pending} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Cancel</button><button type="button" onClick={() => dialog === 'revision' ? void createRevision() : void confirmPauseResume()} disabled={pending} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-50">{pending ? 'Working…' : dialog === 'pause' ? 'Pause Template' : dialog === 'resume' ? 'Resume Template' : 'Create Draft Revision'}</button></footer>
      </section>
    </div>}
  </>;
};
