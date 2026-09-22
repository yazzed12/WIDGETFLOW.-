import React, { useEffect, useMemo, useState } from 'react';
import type { WidgetTemplate } from '../../types';
import { useApp } from '../../context/AppContext';
import { DynamicTemplateRenderer } from '../dynamic-template/DynamicTemplateRenderer';
import { validateTemplateValues } from '../dynamic-template/validationHelper';
import { getReportBusinessFieldKey, isSignatureConfigurationComplete, normalizeReportDataForEditing, normalizeSignatureRoleKey, resolveEffectiveReportSignatureFields, serializeReportSignatureConfiguration } from '../../shared/signatureResolver';
import { reportService } from '../../features/reports/reportService';
import { configurationService } from '../../features/configuration/services/configurationService';
import { normalizeError } from '../../lib/errors/errorHandling';
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
  const [activeRoles, setActiveRoles] = useState<Array<{ key: string; name: string }>>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState('');
  const initialSignatureConfigurations = useMemo(() => Object.fromEntries(
    (reportToEdit?.signatureConfigurations ?? []).map((configuration) => [configuration.signatureFieldKey, {
      configured: true,
      requiredRoleKey: configuration.requiredRoleKey ?? '',
      displayLabel: configuration.displayLabelOverride ?? '',
      signatureRole: configuration.signatureRole,
    }])
  ), [reportToEdit]);
  const [signatureConfigurations, setSignatureConfigurations] = useState<Record<string, { configured: boolean; requiredRoleKey: string; displayLabel?: string; signatureRole?: 'sender' | 'receiver' }>>(initialSignatureConfigurations);
  const [signatureConfigurationDirty, setSignatureConfigurationDirty] = useState<Record<string, boolean>>({});
  const [signatureConfigurationErrors, setSignatureConfigurationErrors] = useState<Record<string, string>>({});
  const [signatureCustomizationEnabled, setSignatureCustomizationEnabled] = useState(() =>
    (reportToEdit?.signatureConfigurations ?? []).some((configuration) => configuration.isOverride)
  );
  // Every report surface starts from the same historical/current snapshot
  // resolver and overlays persisted report configuration by stable field key.
  const signatureFields = useMemo(
    () => resolveEffectiveReportSignatureFields(template, reportToEdit?.signatureConfigurations ?? []),
    [template, reportToEdit?.signatureConfigurations],
  );
  const [showTemplateResetConfirmation, setShowTemplateResetConfirmation] = useState(false);

  useEffect(() => {
    const requiresRoleDirectory = signatureCustomizationEnabled;
    if (!requiresRoleDirectory) {
      setRolesLoading(false);
      return;
    }
    let mounted = true;
    void configurationService.signatureRoleDirectory()
      .then((roles) => {
        if (mounted) setActiveRoles(Array.from(new Map(roles.map((role: any) => [String(role.key), { key: String(role.key), name: String(role.name) }])).values()));
      })
      .catch(() => { if (mounted) { setActiveRoles([]); setRolesError('Unable to load active signer roles.'); } })
      .finally(() => { if (mounted) setRolesLoading(false); });
    return () => { mounted = false; };
  }, [signatureCustomizationEnabled, signatureFields]);

  const persistSignatureConfigurations = async (reportId: string) => {
    await Promise.all(signatureFields
      .filter((field) => signatureConfigurationDirty[field.fieldKey])
      .map(async (field) => {
        const draft = signatureConfigurations[field.fieldKey];
        if (!draft?.configured) {
          await reportService.resetSignatureConfiguration(reportId, field.fieldKey);
          return;
        }
        const payload = serializeReportSignatureConfiguration(field, draft);
        await reportService.setSignatureConfiguration(reportId, payload.signatureFieldKey, payload.signatureRole, payload.requiredRole, payload.displayLabel);
      }));
    setSignatureConfigurationDirty({});
  };

  const validateSignatureConfigurations = () => {
    if (!signatureCustomizationEnabled) {
      setSignatureConfigurationErrors({});
      return true;
    }
    const activeRoleKeys = activeRoles.map((role) => normalizeSignatureRoleKey(role.key));
    const missing = Object.fromEntries(signatureFields
      .filter((field) => !isSignatureConfigurationComplete(field, signatureConfigurations[field.fieldKey], activeRoleKeys))
      .map((field) => [field.fieldKey, 'Please configure this signature field before completing the report.']));
    setSignatureConfigurationErrors(missing);
    return Object.keys(missing).length === 0;
  };

  const creatorRequiredMissing = signatureCustomizationEnabled ? signatureFields.filter((field) => !isSignatureConfigurationComplete(
    field,
    signatureConfigurations[field.fieldKey],
    activeRoles.map((role) => normalizeSignatureRoleKey(role.key)),
  )) : [];

  const previewSignatureConfigurations = signatureFields.map((field) => ({
    reportId: reportToEdit?.id ?? '',
    signatureFieldKey: field.fieldKey,
    signatureRole: signatureCustomizationEnabled && signatureConfigurations[field.fieldKey]?.configured
      ? signatureConfigurations[field.fieldKey].signatureRole ?? field.signatureRole
      : field.signatureRole,
    displayLabelOverride: signatureCustomizationEnabled && signatureConfigurations[field.fieldKey]?.configured
      ? signatureConfigurations[field.fieldKey].displayLabel?.trim() || null
      : null,
    requiredRoleKey: !signatureCustomizationEnabled
      ? field.defaultRequiredRoleKey
      : (signatureConfigurations[field.fieldKey]?.configured ? signatureConfigurations[field.fieldKey].requiredRoleKey || null : field.defaultRequiredRoleKey),
    assignmentPolicy: field.assignmentPolicy,
    isOverride: signatureCustomizationEnabled && (signatureConfigurations[field.fieldKey]?.configured ?? false),
    inherited: !signatureCustomizationEnabled || !signatureConfigurations[field.fieldKey]?.configured,
  }));

  const resetToTemplateSettings = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all(signatureFields
        .filter((field) => field.assignmentPolicy === 'default_override_allowed' && signatureConfigurations[field.fieldKey]?.configured)
        .map((field) => reportService.resetSignatureConfiguration(reportToEdit!.id, field.fieldKey)));
      setSignatureConfigurations((previous) => {
        const next = { ...previous };
        signatureFields.filter((field) => field.assignmentPolicy === 'default_override_allowed').forEach((field) => { delete next[field.fieldKey]; });
        return next;
      });
      setSignatureConfigurationDirty({});
      setSignatureCustomizationEnabled(false);
      setShowTemplateResetConfirmation(false);
    } catch (error) {
      showToast(normalizeError(error, 'complete').message, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomizationToggle = (enabled: boolean) => {
    if (enabled) {
      setSignatureCustomizationEnabled(true);
      return;
    }
    const hasPersistedOverride = (reportToEdit?.signatureConfigurations ?? []).some((configuration) => configuration.isOverride && configuration.assignmentPolicy === 'default_override_allowed');
    if (hasPersistedOverride && reportToEdit?.id) {
      setShowTemplateResetConfirmation(true);
      return;
    }
    setSignatureConfigurations((previous) => {
      const next = { ...previous };
      signatureFields.filter((field) => field.assignmentPolicy === 'default_override_allowed').forEach((field) => { delete next[field.fieldKey]; });
      return next;
    });
    setSignatureConfigurationDirty((previous) => {
      const next = { ...previous };
      signatureFields.filter((field) => field.assignmentPolicy === 'default_override_allowed').forEach((field) => { delete next[field.fieldKey]; });
      return next;
    });
    setSignatureCustomizationEnabled(false);
  };

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
      await reportService.saveDraft(activeReport.id, canonicalData, reportTitle.trim() || defaultTitle);
      await persistSignatureConfigurations(activeReport.id);
      await refreshReports();
      showToast('Report draft saved', 'info');
      onClose();
      setActiveView('reports');
    } catch (err: any) {
      const safe = normalizeError(err, 'complete');
      if (safe.fieldKey) setSignatureConfigurationErrors((previous) => ({ ...previous, [safe.fieldKey!]: safe.message }));
      showToast(safe.message, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReport = async () => {
    if (!validate()) return;
    if (!validateSignatureConfigurations()) {
      showToast('Please complete the required signature configuration.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const canonicalData = canonicalizeForPersistence(formData);
      const persistedReport = await ensurePersistedReport();
      await reportService.saveDraft(persistedReport.id, canonicalData, reportTitle.trim() || defaultTitle);
      await persistSignatureConfigurations(persistedReport.id);
      const activeReport = (await updateReportInstance(persistedReport.id, canonicalData, reportTitle.trim() || defaultTitle, true))!;
      await refreshReports();

      // Supabase Reports are intentionally send-blocked until Phase 4B.3;
      // never open the legacy recipient flow for a UUID-backed Report.
      onClose();
      openSendReportModal(activeReport);
    } catch (err: any) {
      const safe = normalizeError(err, 'complete');
      if (safe.fieldKey) setSignatureConfigurationErrors((previous) => ({ ...previous, [safe.fieldKey!]: safe.message }));
      showToast(safe.message, 'warning');
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
            signatureAssignments={reportToEdit?.signatureAssignments}
            signatureConfigurations={previewSignatureConfigurations}
            assignments={reportToEdit?.assignments}
            currentUser={currentUser}
          />

          {showTemplateResetConfirmation && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3" role="alertdialog" aria-label="Confirm template signature settings">
              <p className="text-xs font-semibold text-slate-900">Use template signature settings?</p>
              <p className="text-[11px] text-slate-600">This will remove the signature role customizations made for this report and restore the template defaults.</p>
              <div className="flex justify-end gap-2">
                <button type="button" disabled={isSubmitting} onClick={() => setShowTemplateResetConfirmation(false)} className="px-3 py-1.5 text-[11px] font-semibold text-slate-700 border border-slate-300 rounded-lg">Cancel</button>
                <button type="button" disabled={isSubmitting} onClick={() => void resetToTemplateSettings()} className="px-3 py-1.5 text-[11px] font-semibold text-white bg-indigo-600 rounded-lg">Use Template Settings</button>
              </div>
            </div>
          )}

          {signatureFields.length > 0 && (
            <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3" aria-label="Signature settings">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Signature Settings</h3>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-700">Customize signature settings for this report</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{signatureCustomizationEnabled ? 'Custom signature settings are active for this report.' : 'Using template signature settings.'}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={signatureCustomizationEnabled}
                    aria-label="Customize signature settings for this report"
                    onClick={() => handleCustomizationToggle(!signatureCustomizationEnabled)}
                    disabled={isSubmitting || rolesLoading}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${signatureCustomizationEnabled ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-slate-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${signatureCustomizationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                  <span>{signatureFields.length} signature fields</span>
                  <span>{signatureFields.filter((field) => field.signatureRole === 'sender').length} Sender</span>
                  <span>{signatureFields.filter((field) => field.signatureRole === 'receiver').length} Receiver</span>
                </div>
                {signatureCustomizationEnabled && creatorRequiredMissing.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2" role="status">
                    <p className="text-[11px] font-semibold text-amber-900">Signature configuration required</p>
                    <p className="mt-0.5 text-[11px] text-amber-800">This template requires one or more signature roles to be configured before the report can be completed.</p>
                  </div>
                )}
              </div>
              {signatureCustomizationEnabled && signatureFields.map((field) => {
                const draft = signatureConfigurations[field.fieldKey];
                const inherited = !draft?.configured;
                const currentValue = field.assignmentPolicy === 'report_creator_required' && inherited
                  ? '__unset__'
                  : draft?.configured ? draft.requiredRoleKey : (field.defaultRequiredRoleKey ?? '');
                const templateRoleName = activeRoles.find((role) => role.key === field.defaultRequiredRoleKey)?.name ?? field.defaultRequiredRoleKey;
                const effectiveRoleKey = inherited ? field.defaultRequiredRoleKey ?? '' : draft?.requiredRoleKey ?? '';
                const effectiveContext = draft?.configured ? draft.signatureRole ?? field.signatureRole : field.signatureRole;
                const effectiveLabel = draft?.configured ? draft.displayLabel?.trim() || field.label : field.label;
                const effectiveRoleName = activeRoles.find((role) => role.key === effectiveRoleKey)?.name ?? effectiveRoleKey;
                return (
                  <div key={field.fieldKey} className="min-w-0 rounded-xl border border-indigo-100 bg-white p-4 space-y-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-xs font-semibold text-slate-900">{effectiveLabel}</p>
                        <p className="mt-1 text-[10px] text-slate-500">Signer context · <span className="font-semibold text-slate-700">{effectiveContext === 'sender' ? 'Sender' : 'Receiver'}</span></p>
                      </div>
                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
                        {field.assignmentPolicy === 'fixed' ? 'Fixed' : field.assignmentPolicy === 'default_override_allowed' ? 'Override allowed' : draft?.configured ? 'Configured for this report' : 'Configuration required'}
                      </span>
                    </div>
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0"><p className="text-[10px] text-slate-500">Template role</p><p className="break-words text-xs font-semibold text-slate-800">{templateRoleName || 'Not defined'}</p></div>
                      <div className="min-w-0"><p className="text-[10px] text-slate-500">Effective role</p><p className={`break-words text-xs font-semibold ${effectiveRoleName ? 'text-slate-800' : 'text-amber-700'}`}>{effectiveRoleName || 'Configuration required'}</p></div>
                    </div>
                    {field.assignmentPolicy === 'fixed' ? (
                      <div className="space-y-1 text-[11px] text-slate-500"><p className="font-semibold">Locked by template governance</p><p>Field label, signer context, and required role are visible but cannot be changed for this report.</p></div>
                    ) : (
                      <div className="min-w-0 space-y-2">
                        <label className="block text-[10px] font-semibold text-slate-600">Field label</label>
                        <input value={draft?.displayLabel ?? field.label} onChange={(event) => {
                          setSignatureConfigurations((previous) => ({ ...previous, [field.fieldKey]: { configured: true, requiredRoleKey: draft?.requiredRoleKey ?? field.defaultRequiredRoleKey ?? '', signatureRole: draft?.signatureRole ?? field.signatureRole, displayLabel: event.target.value } }));
                          setSignatureConfigurationDirty((previous) => ({ ...previous, [field.fieldKey]: true }));
                        }} disabled={isSubmitting || rolesLoading} className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs" />
                        <label className="block text-[10px] font-semibold text-slate-600">Signer context</label>
                        <select value={effectiveContext} onChange={(event) => {
                          setSignatureConfigurations((previous) => ({ ...previous, [field.fieldKey]: { configured: true, requiredRoleKey: draft?.requiredRoleKey ?? field.defaultRequiredRoleKey ?? '', signatureRole: event.target.value as 'sender' | 'receiver', displayLabel: draft?.displayLabel ?? field.label } }));
                          setSignatureConfigurationDirty((previous) => ({ ...previous, [field.fieldKey]: true }));
                        }} disabled={isSubmitting || rolesLoading} className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs"><option value="sender">Sender</option><option value="receiver">Receiver</option></select>
                        <label className="block text-[10px] font-semibold text-slate-600">{field.assignmentPolicy === 'report_creator_required' ? 'Required role for this report' : 'Override required role'}</label>
                        <select
                          value={currentValue}
                          onChange={(event) => {
                            setSignatureConfigurations((previous) => ({ ...previous, [field.fieldKey]: { configured: true, requiredRoleKey: event.target.value, signatureRole: draft?.signatureRole ?? field.signatureRole, displayLabel: draft?.displayLabel ?? field.label } }));
                            setSignatureConfigurationDirty((previous) => ({ ...previous, [field.fieldKey]: true }));
                            setSignatureConfigurationErrors((previous) => ({ ...previous, [field.fieldKey]: '' }));
                          }}
                          disabled={isSubmitting || rolesLoading}
                          aria-label={`${field.label} required role`}
                          className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs"
                        >
                          {currentValue === '__unset__' && <option value="__unset__" disabled>Select a role for this required field</option>}
                          {activeRoles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}
                        </select>
                        {field.assignmentPolicy === 'default_override_allowed' && draft?.configured && <button type="button" disabled={isSubmitting || rolesLoading} onClick={() => {
                          setSignatureConfigurations((previous) => ({ ...previous, [field.fieldKey]: { configured: false, requiredRoleKey: '' } }));
                          setSignatureConfigurationDirty((previous) => ({ ...previous, [field.fieldKey]: true }));
                          setSignatureConfigurationErrors((previous) => ({ ...previous, [field.fieldKey]: '' }));
                        }} className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-50">Reset to template default</button>}
                        {rolesError && <p className="text-[11px] text-rose-600">{rolesError}</p>}
                        {signatureConfigurationErrors[field.fieldKey] && <p className="text-[11px] text-rose-600">{signatureConfigurationErrors[field.fieldKey]}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}
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
