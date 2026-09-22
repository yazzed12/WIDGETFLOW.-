import React from 'react';
import { ShieldCheck, CheckCircle2, FileSignature, Clock } from 'lucide-react';
import type { TemplateComponent, ReportSignatureRecord, ReportSignatureAssignment, ReportAssignment, ReportSignatureConfiguration, User, TemplateTheme } from '../../types';
import { getReportBusinessFieldKey, resolveReportAssignmentForComponent, resolveReportSignatureForComponent } from '../../shared/signatureResolver.js';
import { resolveSignatureShellStyle } from '../../shared/themeResolver.js';
import { getSignatureFontFamily } from '../signature/SignatureEditor';
import { signatureService } from '../../features/signature/signatureService';

export { resolveReportSignatureForComponent };

interface SignatureRendererProps {
  component: TemplateComponent;
  readOnly?: boolean;
  activeSignature?: ReportSignatureRecord | null;
  activeSignatures?: ReportSignatureRecord[];
  signatureHistory?: ReportSignatureRecord[];
  signatureAssignments?: ReportSignatureAssignment[];
  assignments?: ReportAssignment[];
  signatureConfigurations?: ReportSignatureConfiguration[];
  /** Compatibility prop for callers; signer identity comes from workflow records only. */
  currentUser?: User;
  theme?: TemplateTheme;
  value?: any;
  reportId?: string;
}

type NormalizedPoint = { x: number; y: number };

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeDrawingData(raw: any): NormalizedPoint[][] {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.strokes)) return [];
  return raw.strokes
    .filter((stroke: any) => Array.isArray(stroke))
    .map((stroke: any[]) => stroke
      .filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point) => ({ x: clamp01(point.x), y: clamp01(point.y) })))
    .filter((stroke: NormalizedPoint[]) => stroke.length > 0);
}

function normalizePersistedSignature(raw: any): any | null {
  if (!raw || typeof raw !== 'object') return null;
  const signatureMethod = raw.signatureMethod ?? raw.signature_method;
  const typedName = raw.typedName ?? raw.typed_name;
  const typedFontKey = raw.typedFontKey ?? raw.typed_font_key;
  const drawingData = raw.drawingData ?? raw.drawing_data;
  const signatureAssetId = raw.signatureAssetId ?? raw.signature_asset_id;
  return {
    signatureMethod: typeof signatureMethod === 'string' ? signatureMethod.toLowerCase() : undefined,
    typedName,
    typedFontKey,
    drawingData,
    signatureAssetId,
  };
}

export const SignatureRenderer: React.FC<SignatureRendererProps> = ({
  component,
  readOnly,
  activeSignature,
  activeSignatures,
  signatureHistory,
  signatureAssignments,
  assignments,
  signatureConfigurations,
  theme,
  value,
  reportId,
}) => {
  const shellStyle = resolveSignatureShellStyle(component, theme);
  const sigConfig = component.signatureConfig || {};
  const rawRole = sigConfig.signatureRole || (component as any).signatureRole || 'Sender';
  const canonicalRole = String(rawRole).toLowerCase() === 'sender' ? 'sender' : 'receiver';
  const roleDisplayLabel = canonicalRole === 'sender' ? 'Sender' : 'Receiver';
  const effectiveConfiguration = signatureConfigurations?.find((configuration) => configuration.signatureFieldKey === getReportBusinessFieldKey(component));
  const effectiveRoleContext = effectiveConfiguration?.signatureRole === 'sender' ? 'sender' : effectiveConfiguration?.signatureRole === 'receiver' ? 'receiver' : canonicalRole;
  const requiredRole = typeof effectiveConfiguration?.requiredRoleKey === 'string' && effectiveConfiguration.requiredRoleKey.trim()
    ? effectiveConfiguration.requiredRoleKey.trim()
    : typeof sigConfig.requiredRole === 'string' && sigConfig.requiredRole.trim()
      ? sigConfig.requiredRole.trim()
    : null;
  const assignmentPolicy = sigConfig.assignmentPolicy;

  const label =
    effectiveConfiguration?.displayLabelOverride ||
    sigConfig.label ||
    (component as any).label ||
    (canonicalRole === 'sender' ? 'Prepared & Submitted By' : 'Reviewed & Approved By');

  const showName = sigConfig.showName !== false;
  const showRole = sigConfig.showRole !== false;
  const showDate = sigConfig.showDate !== false;
  const showImage = sigConfig.showSignatureImage !== false;

  // Resolve active signature record for this component
  const relevantSignature = resolveReportSignatureForComponent({
    component,
    activeSignatures,
    signatureHistory,
    activeSignature,
    signatureAssignments,
  });
  const relevantAssignment = resolveReportAssignmentForComponent({ component, signatureAssignments, assignments });
  const persisted = normalizePersistedSignature(value);
  const hasPersisted = !!(persisted && (persisted.signatureMethod || persisted.typedName || persisted.drawingData || persisted.signatureAssetId));
  const persistedName = persisted?.typedName || value?.signedByName || value?.signerName;
  const persistedDrawing = normalizeDrawingData(persisted?.drawingData);
  const drawingToRender = hasPersisted ? persistedDrawing : normalizeDrawingData((relevantSignature as any)?.drawingData);
  const persistedImage = typeof persisted?.drawingData === 'string' && persisted.drawingData.startsWith('data:') ? persisted.drawingData : undefined;
  const uploadedAssetId = persisted?.signatureAssetId || (relevantSignature as any)?.signatureAssetId;
  const [resolvedUploadedUrl, setResolvedUploadedUrl] = React.useState<string>();
  React.useEffect(() => {
    let mounted = true;
    setResolvedUploadedUrl(undefined);
    if (reportId && uploadedAssetId && (persisted?.signatureMethod || relevantSignature?.signatureMethod) === 'uploaded') {
      void signatureService.resolveReportSignaturePreview(reportId, uploadedAssetId).then((url) => { if (mounted) setResolvedUploadedUrl(url); }).catch(() => undefined);
    }
    return () => { mounted = false; };
  }, [reportId, uploadedAssetId, persisted?.signatureMethod, relevantSignature?.signatureMethod]);

  if (readOnly || relevantSignature || hasPersisted) {
    if (relevantSignature || hasPersisted) {
      const displaySignature: any = hasPersisted ? { ...(relevantSignature || {}), signatureMethod: persisted.signatureMethod || 'typed', signatureDataUrl: persistedImage || resolvedUploadedUrl, drawingData: persisted.drawingData, typedFontKey: persisted.typedFontKey, typedName: persistedName, signedByName: persistedName || relevantSignature?.signedByName || 'Signed user', signedByRole: relevantSignature?.signedByRole || roleDisplayLabel, verificationId: relevantSignature?.verificationId || persisted.signatureAssetId || 'Persisted signature' } : { ...(relevantSignature || {}), signatureDataUrl: resolvedUploadedUrl || relevantSignature?.signatureDataUrl };
      const isSender = String(displaySignature.signatureRole || effectiveRoleContext).toLowerCase() === 'sender';
      const formattedDate = displaySignature.signedAt
        ? new Date(displaySignature.signedAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        : '';

      return (
        <div
          className="p-4 border rounded-2xl space-y-3 select-none"
          style={{ backgroundColor: shellStyle.surfaceBg, borderColor: shellStyle.borderColor }}
        >
          {/* Header Role & Verification Badge */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
            <div
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: shellStyle.labelFontFamily, color: shellStyle.labelColor }}
            >
              <FileSignature className="w-4 h-4 text-indigo-600" />
              <span>{label}</span>
            </div>

            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{isSender ? 'Sender Signed' : 'Reviewer Signed'}</span>
            </div>
          </div>

          {/* Signature Representation */}
          {showImage && (
            <div className="py-2.5 px-4 bg-white border border-slate-200 rounded-xl min-h-[60px] flex items-center justify-center">
              {displaySignature.signatureMethod === 'drawn' && drawingToRender.length ? (
                <svg viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid meet" className="h-16 w-full max-h-20" role="img" aria-label="Drawn signature">
                  {drawingToRender.map((stroke, index) => stroke.length === 1 ? (
                    <circle key={index} cx={stroke[0].x * 1000} cy={stroke[0].y * 300} r="6" fill="currentColor" />
                  ) : (
                    <polyline key={index} points={stroke.map((point) => `${point.x * 1000},${point.y * 300}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                  ))}
                </svg>
              ) : displaySignature.signatureDataUrl ? (
                <img src={displaySignature.signatureDataUrl} alt="Digital Signature" className="max-h-14 object-contain" />
              ) : displaySignature.signatureMethod === 'uploaded' ? (
                <p className="text-xs italic text-slate-500">Imported signature asset</p>
              ) : (
                <p className="font-serif italic text-2xl text-indigo-950 font-extrabold tracking-wide">
                  <span style={{ fontFamily: getSignatureFontFamily(displaySignature.typedFontKey) }}>{displaySignature.typedName || displaySignature.signedByName}</span>
                </p>
              )}
            </div>
          )}

          {/* Metadata Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600">
            <div>
              {showName && <span className="font-bold text-slate-900">{displaySignature.signedByName}</span>}
              {showRole && <span className="text-slate-500 font-medium"> ({displaySignature.signedByRole})</span>}
            </div>

            {showDate && formattedDate && (
              <div className="flex items-center gap-1 text-slate-500 font-medium">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formattedDate}</span>
              </div>
            )}
          </div>

          {/* Verification ID Badge */}
          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-sans">
              <ShieldCheck className="w-3 h-3 text-indigo-600" />
              Verification ID: {displaySignature.verificationId}
            </span>
            <span className="capitalize">Method: {displaySignature.signatureMethod}</span>
          </div>
        </div>
      );
    }

    // Unsigned ReadOnly state
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 select-none text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <FileSignature className="w-4 h-4 text-slate-400" />
          <span>{label}</span>
        </div>
        <div className="py-4 border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs italic bg-white">
          Awaiting {roleDisplayLabel} signature sign-off
        </div>
      </div>
    );
  }

  // Active Interactive Edit / Draft Mode
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
          {roleDisplayLabel} Signature Field
        </span>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
        <p className="text-xs text-slate-700 font-medium">
          {relevantAssignment
            ? `Assigned signer: ${relevantAssignment.recipientName || 'Assigned recipient'}${relevantAssignment.recipientRoleName ? ` · ${relevantAssignment.recipientRoleName}` : ''}`
            : `Required signer: ${roleDisplayLabel}${requiredRole ? ` · ${requiredRole}` : ''}`}
        </p>
        <p className="text-[11px] text-slate-500">
          {assignmentPolicy === 'report_creator_required'
            ? 'The report creator must configure this assignment before submission.'
            : 'The report workflow resolves the assigned signer before signing.'}
        </p>
        <p className="text-[11px] text-slate-500 italic">
          The actual signer and signature are shown only after an authorized workflow action.
        </p>
      </div>
    </div>
  );
};
