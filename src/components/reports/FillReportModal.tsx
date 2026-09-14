import React, { useState } from 'react';
import type { WidgetTemplate } from '../../types';
import { useApp } from '../../context/AppContext';
import { DynamicTemplateRenderer } from '../dynamic-template/DynamicTemplateRenderer';
import { validateTemplateValues } from '../dynamic-template/validationHelper';
import { getReportBusinessFieldKey, normalizeReportDataForEditing } from '../../shared/signatureResolver';
import { X, FileText, Save, Send, AlertCircle, Loader2 } from 'lucide-react';

interface FillReportModalProps {
  template: WidgetTemplate;
  onClose: () => void;
}

export const FillReportModal: React.FC<FillReportModalProps> = ({ template, onClose }) => {
  const {
    currentUser,
    categories,
    ensureReportInstance,
    updateReportInstance,
    openSendReportModal,
    refreshReports,
    showToast,
    reportToEdit,
    setActiveView,
  } = useApp();

  const categoryName = categories.find((c) => c.id === template.categoryId)?.name || 'General';

  // Default report title
  const defaultTitle = reportToEdit
    ? reportToEdit.title
    : `${currentUser.name} - ${template.name} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const [reportTitle, setReportTitle] = useState(defaultTitle);
  const [formData, setFormData] = useState<Record<string, any>>(() =>
    normalizeReportDataForEditing(reportToEdit ? reportToEdit.data : {}, template)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors = validateTemplateValues(template, formData);
    if (!reportTitle.trim()) {
      newErrors.title = 'Report title is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canonicalizeForPersistence = (data: Record<string, any>) => {
    const fields = Array.isArray((template as any).components) && (template as any).components.length > 0
      ? (template as any).components
      : Array.isArray((template as any).fields) ? (template as any).fields : [];
    const missing = fields.filter((field: any) => {
      const type = field.type || field.field_type;
      return type !== 'heading' && type !== 'paragraph' && !getReportBusinessFieldKey(field);
    });
    if (missing.length > 0) {
      throw new Error(`REPORT_FIELD_KEY_MISSING:${missing.map((field: any) => field.id || 'unknown').join(',')}`);
    }
    return normalizeReportDataForEditing(data, template);
  };

  const ensurePersistedReport = async () => {
    const canonicalData = canonicalizeForPersistence(formData);
    return ensureReportInstance({
      templateId: template.id,
      data: canonicalData,
      title: reportTitle.trim() || defaultTitle,
    });
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      const canonicalData = canonicalizeForPersistence(formData);
      const activeReport = await ensurePersistedReport();
      await updateReportInstance(activeReport.id, canonicalData, reportTitle.trim() || defaultTitle, false);
      showToast('Report draft saved', 'info');
      onClose();
      setActiveView('reports');
    } catch (err: any) {
      showToast(err.message || 'Failed to save draft', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReport = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const canonicalData = canonicalizeForPersistence(formData);
      const persistedReport = await ensurePersistedReport();
      const activeReport = (await updateReportInstance(persistedReport.id, canonicalData, reportTitle.trim() || defaultTitle, true))!;
      await refreshReports();

      // Supabase Reports are intentionally send-blocked until Phase 4B.3;
      // never open the legacy recipient flow for a UUID-backed Report.
      onClose();
      openSendReportModal(activeReport);
    } catch (err: any) {
      showToast(err.message || 'Failed to prepare report for sending', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-scale-up">
        {/* Modal Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {reportToEdit ? 'Edit Report Draft' : 'Create Report'}
                </h2>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Template: {template.name} ({template.version || 'v1.0'})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Fill this report template with business metrics and observations for {categoryName}.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Dynamic Form */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Report Title */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Report Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => {
                setReportTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-60"
            />
            {errors.title && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Universal Dynamic Template Renderer */}
          <DynamicTemplateRenderer
            template={template}
            values={formData}
            mode="edit"
            onChange={setFormData}
            errors={errors}
            reportId={reportToEdit?.id}
            ensureReportId={async () => (await ensurePersistedReport()).id}
            activeSignatures={reportToEdit?.activeSignatures}
            signatureHistory={reportToEdit?.signatureHistory}
            currentUser={currentUser}
          />
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-slate-600" /> : <Save className="w-4 h-4 text-slate-600" />}
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={handleSendReport}
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
