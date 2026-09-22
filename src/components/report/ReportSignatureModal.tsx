import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Check, FileSignature } from 'lucide-react';
import type { User, UserSignatureProfile } from '../../types';
import { apiService } from '../../services/apiService';
import { normalizeError } from '../../lib/errors/errorHandling';

interface ReportSignatureModalProps {
  reportTitle: string;
  signatureRole: 'sender' | 'receiver';
  currentUser: User;
  confirmationStatement?: string;
  onConfirm: (payload: {
    signatureRole: 'sender' | 'receiver';
    signatureMethod: 'uploaded' | 'drawn' | 'typed';
    typedName?: string;
    signatureDataUrl?: string;
    confirmationStatement: string;
  }) => Promise<void>;
  onClose: () => void;
  isSupabaseReport?: boolean;
}

export const ReportSignatureModal: React.FC<ReportSignatureModalProps> = ({
  reportTitle,
  signatureRole,
  currentUser,
  confirmationStatement,
  onConfirm,
  onClose,
  isSupabaseReport = false,
}) => {
  const [profile, setProfile] = useState<UserSignatureProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const profileRequest = isSupabaseReport
      ? Promise.resolve<UserSignatureProfile | null>(null)
      : apiService.getUserSignatureProfile();
    profileRequest
      .then((prof) => {
        if (isMounted) {
          setProfile(
            prof || {
              id: `sigprof-${currentUser.id}`,
              userId: currentUser.id,
              method: 'typed',
              typedName: currentUser.name,
            }
          );
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProfile({
            id: `sigprof-${currentUser.id}`,
            userId: currentUser.id,
            method: 'typed',
            typedName: currentUser.name,
          });
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [currentUser, isSupabaseReport]);

  const defaultStatement =
    confirmationStatement ||
    (signatureRole === 'sender'
      ? 'By continuing, I confirm that I reviewed this report and intend to sign and send it.'
      : 'I confirm that I reviewed this report and intend to sign this business record.');

  const handleConfirm = async () => {
    try {
      setIsSigning(true);
      setErrorMsg(null);

      const method = profile?.method || 'typed';
      const typedName = profile?.typedName || currentUser.name;
      const signatureDataUrl = profile?.drawingReference || profile?.assetReference || undefined;

      await onConfirm({
        signatureRole,
        signatureMethod: method,
        typedName,
        signatureDataUrl,
        confirmationStatement: defaultStatement,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(normalizeError(err, 'sign').message);
      setIsSigning(false);
    }
  };

  const isSender = signatureRole === 'sender';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider">
                {isSender ? 'Sign & Submit Report' : 'Review & Sign Report'}
              </h2>
              <p className="text-[11px] text-slate-400">Explicit Signature Confirmation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Report Context */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Report Document</span>
            <h3 className="text-xs font-bold text-slate-900 truncate">{reportTitle}</h3>
          </div>

          {/* Signature Preview */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              {profile?.method === 'uploaded' ? 'Uploaded Signature' : profile?.method === 'drawn' ? 'Drawn Signature' : 'Typed Signature'}
            </span>

            <div className="py-3 px-4 bg-white border border-slate-200 rounded-xl min-h-[70px] flex items-center justify-center">
              {isLoading ? (
                <span className="text-xs text-slate-400 animate-pulse">Loading signature profile...</span>
              ) : profile?.method === 'drawn' && profile.drawingReference ? (
                <img src={profile.drawingReference} alt="Drawn Signature" className="max-h-16 object-contain" />
              ) : profile?.method === 'uploaded' && profile.assetReference ? (
                <img src={profile.assetReference} alt="Uploaded Signature" className="max-h-16 object-contain" />
              ) : (
                <p className="font-serif italic text-2xl text-indigo-950 font-extrabold tracking-wide">
                  {profile?.typedName || currentUser.name}
                </p>
              )}
            </div>

            <div className="text-xs font-bold text-slate-800">
              {currentUser.name} <span className="text-slate-500 font-normal">({currentUser.role})</span>
            </div>
          </div>

          {/* Confirmation Statement & Legal Safeguard */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Confirmation Statement</span>
            </div>
            <p className="text-[11px] leading-relaxed italic text-indigo-900">"{defaultStatement}"</p>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-indigo-100">
              By continuing, you perform an explicit signing action. A timestamped audit record and unique Signature Verification ID will be bound to this report.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSigning || isLoading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isSigning ? 'Applying Signature...' : isSender ? 'Sign & Submit' : 'Sign Report'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
