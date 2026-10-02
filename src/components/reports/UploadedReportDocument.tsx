import React, { useState } from 'react';
import { Download, ExternalLink, FileText, AlertCircle } from 'lucide-react';
import type { ReportDocumentVersion, ReportSendCycle } from '../../types';
import { authenticatedBinaryRequest } from '../../services/httpClient';

interface UploadedReportDocumentProps {
  versions: ReportDocumentVersion[];
  currentDocumentVersionId?: string | null;
  currentSendCycleId?: string | null;
  sendCycles?: ReportSendCycle[];
  recipientView?: boolean;
}

export const UploadedReportDocument: React.FC<UploadedReportDocumentProps> = ({ versions, currentDocumentVersionId, currentSendCycleId, sendCycles = [], recipientView = false }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cycle = currentSendCycleId ? sendCycles.find((item) => item.id === currentSendCycleId) : undefined;
  const selectedId = recipientView ? cycle?.documentVersionId : currentDocumentVersionId;
  const current = versions.find((version) => version.id === selectedId)
    ?? (recipientView ? undefined : versions.find((version) => version.id === currentDocumentVersionId));

  const retrieve = async (open: boolean) => {
    if (!current?.assetId) return;
    setBusy(true);
    setError('');
    const popup = open ? window.open('about:blank', '_blank', 'noopener,noreferrer') : null;
    try {
      const { blob, contentType } = await authenticatedBinaryRequest(`/api/assets/${current.assetId}`);
      const objectUrl = URL.createObjectURL(new Blob([blob], { type: contentType || current.mimeType }));
      if (popup) popup.location.href = objectUrl;
      else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = current.filename || 'report-document';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      popup?.close();
      setError('Unable to open this report document. Please try again.');
    } finally { setBusy(false); }
  };

  if (!current) return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">{versions.length ? 'The document version for this send cycle is unavailable.' : 'No report document is attached yet.'}</div>;

  const isPdf = current.mimeType === 'application/pdf' || current.filename.toLowerCase().endsWith('.pdf');
  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><FileText className="h-5 w-5" /></span><div className="min-w-0"><h3 className="text-sm font-bold text-slate-900">Report Document</h3><p className="truncate text-xs text-slate-600">{current.filename || 'Uploaded report file'} · Version {current.versionNumber || '—'}</p><p className="text-[11px] text-slate-400">{current.mimeType}{current.byteSize ? ` · ${(current.byteSize / (1024 * 1024)).toFixed(1)} MB` : ''}{current.createdAt ? ` · ${new Date(current.createdAt).toLocaleString()}` : ''}</p></div></div>
      <div className="flex items-center gap-2"><button type="button" disabled={busy || !current.assetId} onClick={() => void retrieve(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><Download className="h-3.5 w-3.5" />Download</button>{isPdf && <button type="button" disabled={busy || !current.assetId} onClick={() => void retrieve(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><ExternalLink className="h-3.5 w-3.5" />Open PDF</button>}</div>
    </div>
    {error && <p role="alert" className="flex items-center gap-2 text-xs text-rose-700"><AlertCircle className="h-4 w-4" />{error}</p>}
    {versions.length > 1 && <details className="border-t border-slate-100 pt-2"><summary className="cursor-pointer text-xs font-semibold text-slate-600">Document History</summary><ul className="mt-2 space-y-1.5">{[...versions].sort((a, b) => a.versionNumber - b.versionNumber).map((version) => { const cycleForVersion = sendCycles.filter((item) => item.documentVersionId === version.id); return <li key={version.id} className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-600"><span>Version {version.versionNumber || '—'} · {version.filename || 'Report document'}{version.id === current.id ? ' · Current' : ''}</span><span>{cycleForVersion.length ? cycleForVersion.map((item) => `Cycle ${item.cycleNumber}`).join(', ') : 'Not sent'}</span></li>; })}</ul></details>}
  </section>;
};
