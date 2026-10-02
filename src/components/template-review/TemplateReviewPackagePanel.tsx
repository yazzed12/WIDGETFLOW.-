import React from 'react';
import type { TemplateReviewCategory, TemplateReviewPackage } from '../../features/templates/review/templateReviewPackage';

interface TemplateReviewPackagePanelProps {
  reviewPackage: TemplateReviewPackage;
  loading: boolean;
  baselineUnavailable: boolean;
  onViewComponent?: (componentId: string) => void;
}

const CATEGORY_ORDER: TemplateReviewCategory[] = ['Structure', 'Fields', 'Content', 'Tables', 'Signatures', 'Theme', 'Metadata'];

export const TemplateReviewPackagePanel: React.FC<TemplateReviewPackagePanelProps> = ({ reviewPackage, loading, baselineUnavailable, onViewComponent }) => {
  const groupedChanges = CATEGORY_ORDER.map((category) => ({ category, changes: reviewPackage.changes.filter((change) => change.category === category) })).filter((group) => group.changes.length > 0);

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{reviewPackage.mode === 'new_template' ? 'New Template' : 'Review Changes'}</h3>
            <p className="mt-1 text-[11px] text-slate-600">{reviewPackage.mode === 'revision' ? `Compared against: ${reviewPackage.baselineLabel || 'approved version'}` : 'No previous approved template is used as a baseline.'}</p>
            <p className="text-[11px] text-slate-600">Current: {reviewPackage.currentLabel}</p>
          </div>
          {reviewPackage.summary.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {reviewPackage.summary.filter((item) => item.count > 0).map((item) => (
                <span key={item.label} className="rounded-full border border-white bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700">{item.count} {item.label}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && <p className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">Loading previous approved version…</p>}
      {(baselineUnavailable || reviewPackage.warnings.length > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Previous approved version could not be loaded. The review package will not compare against a different or guessed version; approval remains governed by the existing workflow.
        </div>
      )}

      {reviewPackage.mode === 'new_template' && reviewPackage.overview && (
        <div className="space-y-2">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Template</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{reviewPackage.overview.name}</div>
            {reviewPackage.overview.description !== '—' && <p className="mt-1 text-xs text-slate-600">{reviewPackage.overview.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            ['Sections', reviewPackage.overview.sectionCount],
            ['Input fields', reviewPackage.overview.inputFieldCount],
            ['Content components', reviewPackage.overview.contentCount],
            ['Tables', reviewPackage.overview.tableCount],
            ['Signatures', reviewPackage.overview.signatureCount],
            ['Images / assets', reviewPackage.overview.imageCount],
          ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-sm font-bold text-slate-900">{value}</div></div>)}
          <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-3 sm:col-span-1"><div className="text-[10px] uppercase tracking-wide text-slate-500">Category</div><div className="mt-1 text-xs font-semibold text-slate-900">{reviewPackage.overview.category}</div><div className="mt-1 text-[10px] text-slate-500">Version {reviewPackage.overview.version}</div></div>
          </div>
        </div>
      )}

      {reviewPackage.mode === 'new_template' && reviewPackage.overview && (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-800">Template contents by section</summary>
          <div className="space-y-3 border-t border-slate-100 p-4">
            {reviewPackage.overview.sections.map((section, index) => (
              <div key={`${section.title}-${index}`} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">{section.title}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {section.components.map((component, componentIndex) => <span key={`${component.label}-${componentIndex}`} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">{component.label} · {component.type}</span>)}
                  {!section.components.length && <span className="text-[10px] italic text-slate-500">No components</span>}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {reviewPackage.mode === 'revision' && !loading && !baselineUnavailable && reviewPackage.changes.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">No meaningful changes were detected between these versions.</div>
      )}

      {reviewPackage.mode === 'revision' && groupedChanges.map(({ category, changes }) => (
        <section key={category} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <h4 className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">{category} · {changes.length}</h4>
          <ul className="divide-y divide-slate-100">
            {changes.map((change, index) => (
              <li key={`${change.title}-${change.componentId || change.sectionId || index}`} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900">{change.title}</p>
                    {change.context && <p className="mt-0.5 text-[10px] text-slate-500">Section: {change.context}</p>}
                    {(change.before !== undefined || change.after !== undefined) && (
                      <div className="mt-2 grid gap-1 text-[11px] sm:grid-cols-2">
                        {change.before !== undefined && <p className="rounded-md bg-rose-50 px-2 py-1 text-rose-800"><span className="font-semibold">Before:</span> {change.before}</p>}
                        {change.after !== undefined && <p className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800"><span className="font-semibold">After:</span> {change.after}</p>}
                      </div>
                    )}
                  </div>
                  {change.componentId && change.kind !== 'removed' && onViewComponent && <button type="button" onClick={() => onViewComponent(change.componentId!)} className="shrink-0 text-[11px] font-semibold text-indigo-700 underline underline-offset-2">View in template</button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
