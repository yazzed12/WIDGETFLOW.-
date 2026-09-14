import React, { useEffect, useMemo, useState } from 'react';
import type { ReportInstance } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Send, AlertCircle, PenTool, ExternalLink } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { ReportSignatureModal } from '../report/ReportSignatureModal';
import { UserSignatureSettingsModal } from '../user/UserSignatureSettingsModal';
import { reportService } from '../../features/reports/reportService';

interface SendReportModalProps {
  report: ReportInstance;
  onClose: () => void;
}

const signatureRole = (component: any) => String(
  component?.signatureConfig?.signatureRole ??
  component?.signatureRole ??
  component?.configuration?.signatureConfig?.signatureRole ??
  component?.configuration?.signatureRole ??
  '',
).trim().toLowerCase();

const fieldType = (component: any) => String(
  component?.field_type ?? component?.type ?? component?.configuration?.field_type ?? component?.configuration?.type ?? '',
).trim().toLowerCase();

const businessFieldKey = (component: any) => String(
  component?.field_key ?? component?.key ?? component?.configuration?.field_key ?? component?.configuration?.key ?? '',
).trim();

const requiredField = (component: any) => Boolean(
  component?.is_required ?? component?.required ?? component?.configuration?.is_required ??
  component?.configuration?.required ?? component?.signatureConfig?.required ??
  component?.configuration?.signatureConfig?.required,
);

export const SendReportModal: React.FC<SendReportModalProps> = ({ report, onClose }) => {
  const { currentUser, templates, sendReport } = useApp();

  // New assignments are limited to active operational users. Historical report references are unaffected.
  const [availableRecipients, setAvailableRecipients] = useState<any[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => { let mounted = true; void reportService.listRecipientDirectory().then((rows) => { if (mounted) setAvailableRecipients(rows); }).catch((err) => { if (mounted) setError(err.message || 'Unable to load recipients.'); }).finally(() => { if (mounted) setDirectoryLoading(false); }); return () => { mounted = false; }; }, []);

  // Default suggested recipient
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [signatureMappings, setSignatureMappings] = useState<Record<string, string>>({});
  const [senderNote, setSenderNote] = useState('');
  const [error, setError] = useState('');
  const [missingProfileError, setMissingProfileError] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCapacityConfirm, setShowCapacityConfirm] = useState(false);
  const [capacityConfirmed, setCapacityConfirmed] = useState(false);
  const isSupabaseReport = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(report.id);
  const filteredRecipients = useMemo(() => { const q = searchTerm.trim().toLowerCase(); return availableRecipients.filter((u) => !q || `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q)); }, [availableRecipients, searchTerm]);

  // Check template requirements for Sender Signature
  const template = report.templateSnapshot || templates.find((t) => t.id === report.templateId);
  const components: any[] = [];
  const collect = (value: any) => { if (!value) return; if (Array.isArray(value)) { value.forEach(collect); return; } if (typeof value !== 'object') return; if (value.type || value.field_type || value.field_key || value.key) components.push(value); ['components','fields','dynamicSections','sections','rows','children','columns','layout'].forEach((key) => collect(value[key])); };
  collect(template);
  const uniqueComponents = Array.from(new Map(components.map((c: any, i) => [businessFieldKey(c) || `component-${i}`, c])).values());
  const receiverFields = uniqueComponents.filter((c: any) => fieldType(c) === 'signature' && signatureRole(c) === 'receiver').map((c: any) => ({ key: businessFieldKey(c), label: c.signatureConfig?.label || c.configuration?.signatureConfig?.label || c.label || businessFieldKey(c), required: requiredField(c) })).filter((f: any) => f.key);

  const hasSenderSigRequirement = components.some(
    (c: any) => fieldType(c) === 'signature' && signatureRole(c) === 'sender'
  );
  const activeSenderSig = (report.activeSignatures || []).find((s: any) => s.signatureRole === 'sender');
  const mappedRecipientIds = new Set(Object.entries(signatureMappings).filter(([, key]) => key).map(([id]) => id));
  const viewOnlyRecipients = selectedRecipientIds.filter((id) => !mappedRecipientIds.has(id));

  const sendNow = async () => {
    setIsSubmitting(true);
    try {
      await sendReport(report.id, selectedRecipientIds, senderNote.trim(), Object.entries(signatureMappings).filter(([, key]) => key).map(([recipientUserId, signatureFieldKey]) => ({ recipientUserId, signatureFieldKey })));
      onClose();
    } catch (err: any) { setError(err.message || 'Unable to send report.'); }
    finally { setIsSubmitting(false); }
  };

  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (selectedRecipientIds.length === 0) {
      setError('Please select a recipient.');
      return;
    }
    if (receiverFields.length > 0 && selectedRecipientIds.length < receiverFields.length) {
      const additionalRecipients = receiverFields.length - selectedRecipientIds.length;
      setError(`This template requires ${receiverFields.length} recipient signature${receiverFields.length === 1 ? '' : 's'}. You currently selected ${selectedRecipientIds.length}. Add at least ${additionalRecipients} more recipient${additionalRecipients === 1 ? '' : 's'} or choose another template.`);
      return;
    }

    // Sender signature remains part of the legacy workflow only. Supabase
    // Phase 4B.3 Send is intentionally limited to the trusted send RPC.
    if (!isSupabaseReport && hasSenderSigRequirement && !activeSenderSig) {
      try {
        const sigProf = await apiService.getUserSignatureProfile();
        if (!sigProf) {
          setMissingProfileError(true);
          setError('You need to create your signature before signing and sending this report.');
          return;
        }
        setMissingProfileError(false);
        setError('');
        setShowSigModal(true);
      } catch (err) {
        setMissingProfileError(true);
        setError('You need to create your signature before signing and sending this report.');
      }
      return;
    }

    const missingRequired = receiverFields.filter((field: any) => field.required && !Object.values(signatureMappings).includes(field.key));
    if (missingRequired.length > 0) { setError(`Map required receiver signature field(s): ${missingRequired.map((f: any) => f.label).join(', ')}`); return; }
    if (viewOnlyRecipients.length > 0 && !capacityConfirmed) { setShowCapacityConfirm(true); return; }
    // Direct send if no sender signature required or already active
    await sendNow();
  };

  return (
    <>
      {showCapacityConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Not all recipients can sign this report</h3>
            <p className="text-xs text-slate-600">This template contains {receiverFields.length} recipient signature field{receiverFields.length === 1 ? '' : 's'}, but you selected {selectedRecipientIds.length} recipients.</p>
            <div className="text-xs text-slate-700"><p className="font-bold mb-1">The following recipients will receive the report as view-only:</p><ul className="list-disc pl-5 space-y-1">{viewOnlyRecipients.map((id) => <li key={id}>{availableRecipients.find((u) => u.id === id)?.name || id}</li>)}</ul><p className="mt-2">They can view the report but cannot Sign, Return, or Reject it.</p></div>
            <div className="flex justify-between gap-2 pt-2 border-t border-slate-200"><button type="button" disabled={isSubmitting} onClick={() => setShowCapacityConfirm(false)} className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold">Choose Another Template</button><button type="button" disabled={isSubmitting} onClick={() => { setCapacityConfirmed(true); setShowCapacityConfirm(false); void sendNow(); }} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Send to All Recipients</button></div>
          </div>
        </div>
      )}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-scale-up">
          {/* Header */}
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Send Report for Review</h2>
                <p className="text-xs text-slate-500">{report.title}{report.displayId ? ` · ${report.displayId}` : ''}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSendSubmit} className="p-6 space-y-5 text-xs">
            {/* Sender Signature Requirement Notice */}
            {!isSupabaseReport && hasSenderSigRequirement && !activeSenderSig && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
                <PenTool className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950">Sender Digital Signature Required</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    This template requires your digital sign-off. Clicking Send will open the <strong>SIGN & SEND</strong> confirmation.
                  </p>
                </div>
              </div>
            )}

            {/* Recipient Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Select Recipient <span className="text-rose-500">*</span>
              </label>

              <div className="space-y-2">
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search recipients..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                {directoryLoading ? <p className="p-3 text-slate-500">Loading recipients...</p> : filteredRecipients.length === 0 ? <p className="p-3 text-slate-500">No eligible recipients found.</p> : filteredRecipients.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedRecipientIds.includes(user.id)
                        ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="recipient"
                        value={user.id}
                        checked={selectedRecipientIds.includes(user.id)}
                        onChange={() => {
                          setSelectedRecipientIds((prev) => {
                            const next = prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id];
                            if (!next.includes(user.id)) setSignatureMappings((m) => { const copy = { ...m }; delete copy[user.id]; return copy; });
                            return next;
                          });
                          setError('');
                        }}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className={`w-8 h-8 rounded-full ${user.avatarBg} text-white font-bold flex items-center justify-center text-xs shrink-0`}>
                        {user.avatarInitials}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {user.name}
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-white text-indigo-700 border border-indigo-200">
                            {user.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{user.department} • {user.email}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {selectedRecipientIds.length > 0 && receiverFields.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-bold text-slate-800">Signature Assignments</p>
                  {selectedRecipientIds.map((recipientId) => {
                    const usedByOther = new Set(Object.entries(signatureMappings).filter(([id, key]) => id !== recipientId && key).map(([, key]) => key));
                    return <div key={recipientId} className="flex items-center gap-2"><span className="text-[11px] text-slate-600 min-w-0 flex-1">{availableRecipients.find((u) => u.id === recipientId)?.name || recipientId}</span><select value={signatureMappings[recipientId] || ''} onChange={(e) => { setSignatureMappings((m) => ({ ...m, [recipientId]: e.target.value })); setError(''); }} className="flex-1 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"><option value="">No signature required</option>{receiverFields.map((field: any) => <option key={field.key} value={field.key} disabled={usedByOther.has(field.key) && signatureMappings[recipientId] !== field.key}>{field.label}</option>)}</select></div>;
                  })}
                  {selectedRecipientIds.length > receiverFields.length && <p className="text-[11px] text-slate-500">More recipients than receiver signature fields is allowed; some recipients may not need to sign.</p>}
                </div>
              )}

              {error && (
                <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <p className="text-[11px] font-medium text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    {error}
                  </p>

                  {missingProfileError && (
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-xs mt-1"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Create Saved Signature Profile</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Optional Message */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Optional Note for Recipient
              </label>
              <textarea
                rows={3}
                value={senderNote}
                onChange={(e) => setSenderNote(e.target.value)}
                placeholder="Add a note for the recipient (e.g., Please review this week's operational metrics)..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || directoryLoading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>{!isSupabaseReport && hasSenderSigRequirement && !activeSenderSig ? 'Sign & Send' : 'Send Report'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Signature Confirmation Modal */}
      {showSigModal && (
        <ReportSignatureModal
          reportTitle={report.title}
          signatureRole="sender"
          currentUser={currentUser}
          onClose={() => setShowSigModal(false)}
          onConfirm={async (sigPayload) => {
            setShowSigModal(false);
                            await sendReport(report.id, selectedRecipientIds, senderNote.trim(), sigPayload);
            onClose();
          }}
        />
      )}

      {/* User Signature Profile Setup Modal */}
      {showProfileModal && (
        <UserSignatureSettingsModal
          currentUser={currentUser}
          onClose={() => {
            setShowProfileModal(false);
            setMissingProfileError(false);
            setError('');
          }}
        />
      )}
    </>
  );
};
