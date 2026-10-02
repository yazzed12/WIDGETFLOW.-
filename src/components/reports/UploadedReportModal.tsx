import React, { useRef, useState } from 'react';
import { AlertCircle, FileText, LoaderCircle, UploadCloud, X } from 'lucide-react';
import type { ReportInstance } from '../../types';
import { fileToBase64DataUrl, resolveUploadedReportMime, ASSET_GATEWAY_MAX_BYTES } from '../../features/reports/uploadedReportFiles';
import { apiService } from '../../services/apiService';
import { normalizeError } from '../../lib/errors/errorHandling';
import { useApp } from '../../context/AppContext';

interface UploadedReportModalProps {
  onClose: () => void;
  existingReport?: ReportInstance | null;
}

export const UploadedReportModal: React.FC<UploadedReportModalProps> = ({ onClose, existingReport }) => {
  const { showToast, createUploadedReport, attachUploadedReportDocument } = useApp();
  const [title, setTitle] = useState(existingReport?.title ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [reportId, setReportId] = useState(existingReport?.id ?? null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitLock = useRef(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || submitLock.current) return;
    if (!title.trim()) { setError('Enter a report title.'); return; }
    if (!reportId && !file) { setError('Choose a report file to upload.'); return; }
    if (!file && !assetId) { setError('Choose a report file to upload.'); return; }
    if (file && !assetId) {
      if (!resolveUploadedReportMime(file)) { setError('This file type isn’t supported for uploaded reports.'); return; }
      if (file.size > ASSET_GATEWAY_MAX_BYTES) { setError('This file is larger than the allowed upload size.'); return; }
    }

    submitLock.current = true;
    setBusy(true);
    setError('');
    try {
      let activeReportId = reportId;
      if (!activeReportId) {
        const created = await createUploadedReport(title.trim());
        activeReportId = created.id;
        setReportId(activeReportId);
      }

      let activeAssetId = assetId;
      if (!activeAssetId && file) {
        const mimeType = resolveUploadedReportMime(file)!;
        const base64Data = await fileToBase64DataUrl(file);
        const uploaded = await apiService.uploadAsset({
          filename: file.name,
          mimeType,
          base64Data,
          purpose: 'report_attachment',
          linkedReportId: activeReportId!,
        });
        activeAssetId = uploaded.id;
        setAssetId(activeAssetId);
      }

      if (!activeAssetId) throw new Error('UPLOAD_FAILED');
      await attachUploadedReportDocument(activeReportId!, activeAssetId);
      showToast(existingReport ? 'Corrected report document uploaded.' : 'Report uploaded and ready to send.', 'success');
      onClose();
    } catch (caught) {
      const normalized = normalizeError(caught);
      setError(normalized.code === 'FILE_TOO_LARGE'
        ? 'This file is larger than the allowed upload size.'
        : normalized.code === 'FILE_TYPE_NOT_SUPPORTED'
          ? 'This file type isn’t supported for uploaded reports.'
          : assetId || reportId
            ? 'Upload failed. Please try again.'
            : 'We couldn’t upload this report. Please try again.');
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-600 p-2 text-white"><FileText className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">{existingReport ? 'Upload Corrected Report' : 'Upload Existing Report'}</h2><p className="mt-1 text-xs text-slate-500">Upload a document you created and distribute it securely through WidgetFlow.</p></div></div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <label className="block text-xs font-semibold text-slate-700">Report Title <span className="text-rose-500">*</span><input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy || !!existingReport} maxLength={180} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100" placeholder="Enter report title" /></label>
          <label className="block text-xs font-semibold text-slate-700">Report Document <span className="text-rose-500">*</span><input type="file" accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg,.webp" disabled={busy || !!assetId} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(''); }} className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white p-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700" /><span className="mt-1 block text-[11px] font-normal text-slate-500">PDF, DOC, DOCX, XLSX, and supported images · up to 10 MiB</span></label>
          {reportId && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">A draft report has been created. If upload did not finish, retry here; it will continue with this report.</p>}
          {assetId && <p className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-800">File uploaded. Retrying will finalize this same file version.</p>}
          {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
          <footer className="flex justify-between border-t border-slate-100 pt-4"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Cancel</button><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{assetId ? 'Finish Upload' : file && reportId ? 'Upload Corrected Report' : 'Upload Report'}</button></footer>
        </form>
      </div>
    </div>
  );
};
