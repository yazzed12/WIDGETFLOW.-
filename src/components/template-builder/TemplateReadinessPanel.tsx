import React from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Info, ShieldAlert, X } from 'lucide-react';
import type { TemplateReadinessIssue, TemplateReadinessResult } from '../../utils/templateReadiness';

interface TemplateReadinessPanelProps {
  result: TemplateReadinessResult;
  onClose: () => void;
  onNavigate: (issue: TemplateReadinessIssue) => void;
}

export const TemplateReadinessPanel: React.FC<TemplateReadinessPanelProps> = ({ result, onClose, onNavigate }) => {
  const stateLabel = result.state === 'ready' ? 'Ready to Submit' : result.state === 'blocked' ? 'Blocked' : 'Needs Attention';
  const stateClass = result.state === 'ready' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : result.state === 'blocked' ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-amber-700 bg-amber-50 border-amber-200';
  const renderIssue = (item: TemplateReadinessIssue) => (
    <button key={item.id} type="button" onClick={() => onNavigate(item)} className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors cursor-pointer">
      <div className="flex items-start gap-2">
        {item.severity === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
        <span className="text-xs font-semibold text-slate-800 flex-1">{item.message}</span>
        {(item.componentId || item.sectionId) && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      </div>
      {(item.componentId || item.sectionId) && <span className="block pl-6 pt-1 text-[10px] font-bold text-indigo-600">Go to issue</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/30 backdrop-blur-[1px] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="template-readiness-title">
      <aside className="w-full max-w-md h-full overflow-y-auto bg-slate-50 border-l border-slate-200 shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="template-readiness-title" className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-indigo-600" /> Template Readiness</h2>
            <p className={`inline-flex mt-2 rounded-full border px-2.5 py-1 text-[11px] font-bold ${stateClass}`}>{stateLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer" aria-label="Close readiness panel"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-2"><div className="text-lg font-extrabold text-rose-700">{result.errors.length}</div><div className="text-[10px] font-bold text-rose-700">Errors</div></div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-2"><div className="text-lg font-extrabold text-amber-700">{result.warnings.length}</div><div className="text-[10px] font-bold text-amber-700">Warnings</div></div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2"><div className="text-lg font-extrabold text-emerald-700">{result.passedChecks.length}</div><div className="text-[10px] font-bold text-emerald-700">Passed</div></div>
        </div>

        {result.errors.length > 0 && <section className="space-y-2"><h3 className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">Errors</h3>{result.errors.map(renderIssue)}</section>}
        {result.warnings.length > 0 && <section className="space-y-2"><h3 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">Warnings</h3>{result.warnings.map(renderIssue)}</section>}
        <details className="rounded-xl border border-slate-200 bg-white p-3" open={result.errors.length === 0 && result.warnings.length === 0}>
          <summary className="cursor-pointer text-[11px] font-extrabold uppercase tracking-wider text-slate-600">Passed checks</summary>
          <div className="mt-2 space-y-1">{result.passedChecks.map((check) => <div key={check} className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />{check}</div>)}</div>
        </details>
      </aside>
    </div>
  );
};
