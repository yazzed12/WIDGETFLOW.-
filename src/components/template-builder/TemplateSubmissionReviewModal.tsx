import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { Category, WidgetTemplate } from '../../types';
import { useTemplateReviewPackage } from '../../features/templates/review/useTemplateReviewPackage';
import { TemplateReviewPackagePanel } from '../template-review/TemplateReviewPackagePanel';

interface TemplateSubmissionReviewModalProps {
  template: WidgetTemplate;
  categories: Category[];
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const TemplateSubmissionReviewModal: React.FC<TemplateSubmissionReviewModalProps> = ({ template, categories, isSubmitting, onConfirm, onClose }) => {
  const categoryNames = React.useMemo(() => Object.fromEntries(categories.map((category) => [category.id, category.name])), [categories]);
  const { reviewPackage, loading, baselineUnavailable } = useTemplateReviewPackage(template, categoryNames);

  return (
    <div className="fixed inset-0 z-[65] bg-slate-950/60 p-3 sm:p-6 flex items-center justify-center">
      <section role="dialog" aria-modal="true" aria-labelledby="template-submit-review-title" className="w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div><h2 id="template-submit-review-title" className="text-sm font-bold text-slate-900">Review Changes Before Submission</h2><p className="mt-1 text-xs text-slate-500">Check the deterministic review package, then confirm the existing approval submission.</p></div>
          <button type="button" aria-label="Cancel submission review" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <TemplateReviewPackagePanel reviewPackage={reviewPackage} loading={loading} baselineUnavailable={baselineUnavailable} />
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isSubmitting || loading} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{isSubmitting ? 'Submitting…' : 'Confirm Submit'} <ArrowRight className="h-3.5 w-3.5" /></button>
        </footer>
      </section>
    </div>
  );
};
