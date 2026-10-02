import React from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, X } from 'lucide-react';
import type { WidgetTemplate } from '../../types';
import { DynamicTemplateRenderer } from '../dynamic-template/DynamicTemplateRenderer';
import { getNotSimulatedTemplateFields, getTemplateTestRunFields, validateTemplateTestRun } from '../dynamic-template/templateTestRun';

interface TemplateTestRunModalProps {
  template: WidgetTemplate;
  hasReadinessIssues: boolean;
  onClose: () => void;
}

export const TemplateTestRunModal: React.FC<TemplateTestRunModalProps> = ({ template, hasReadinessIssues, onClose }) => {
  const [values, setValues] = React.useState<Record<string, unknown>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<'pass' | 'fail' | null>(null);
  const fields = React.useMemo(() => getTemplateTestRunFields(template), [template]);
  const notSimulatedFields = React.useMemo(() => getNotSimulatedTemplateFields(template), [template]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const resetTestData = () => {
    setValues({});
    setErrors({});
    setResult(null);
  };

  const validate = () => {
    const nextErrors = validateTemplateTestRun(template, values);
    setErrors(nextErrors);
    setResult(Object.keys(nextErrors).length > 0 ? 'fail' : 'pass');
    const firstInvalidKey = fields.find((field) => nextErrors[field.key])?.key;
    if (firstInvalidKey) {
      window.requestAnimationFrame(() => {
        document.getElementById(`test-run-field-${firstInvalidKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  const fieldByKey = new Map(fields.map((field) => [field.key, field]));

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/60 p-3 sm:p-6 flex items-center justify-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-test-run-title"
        className="w-full max-w-5xl max-h-[94vh] bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        <header className="px-5 py-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="template-test-run-title" className="text-base font-bold text-slate-900">Test Run</h2>
            <p className="text-xs text-slate-500 mt-1">Simulate how this template will behave when someone fills a report.</p>
            <p className="text-[11px] text-indigo-700 mt-1">Local simulation only — no report is created or saved.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={resetTestData} className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Reset Test Data
            </button>
            <button type="button" onClick={onClose} aria-label="Close Test Run" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {hasReadinessIssues && (
            <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> This template has readiness issues. Test Run is still available.
            </div>
          )}
          {notSimulatedFields.length > 0 && (
            <div className="mx-4 mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Not simulated:</span>{' '}
              {notSimulatedFields.map((field) => `${field.label} (${field.type})`).join(', ')}.
              {notSimulatedFields.some((field) => field.type === 'signature') && ' Signature action is evaluated during the real report workflow.'}
              {notSimulatedFields.some((field) => field.type === 'file') && ' File upload is available when filling a real report.'}
            </div>
          )}
          <div className="m-3 sm:m-5 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <DynamicTemplateRenderer
              template={template}
              mode="edit"
              values={values}
              errors={errors}
              simulationMode
              onChange={setValues}
            />
          </div>
          {result && (
            <div className={`mx-4 mb-4 rounded-xl border px-4 py-3 ${result === 'pass' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`} aria-live="polite">
              <div className="flex items-center gap-2 text-sm font-bold">
                {result === 'pass' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {result === 'pass' ? 'All testable fields are valid.' : `${Object.keys(errors).length} ${Object.keys(errors).length === 1 ? 'field needs' : 'fields need'} attention before this form could be completed.`}
              </div>
              {result === 'fail' && (
                <ul className="mt-2 space-y-2">
                  {Object.entries(errors).map(([key, message]) => {
                    const field = fieldByKey.get(key);
                    return (
                      <li key={key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                        <span><strong>{field?.label || key}:</strong> {message}</span>
                        <button type="button" className="text-left sm:text-right font-semibold underline underline-offset-2" onClick={() => document.getElementById(`test-run-field-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Go to field</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        <footer className="px-5 py-3 bg-white border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700">Close</button>
          <button type="button" onClick={validate} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">Validate Test Run</button>
        </footer>
      </section>
    </div>
  );
};
