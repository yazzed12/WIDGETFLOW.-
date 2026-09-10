import React from 'react';
import { AlertOctagon, ShieldCheck, AlertTriangle, X, Lock } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  userName: string;
  userEmail: string;
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  userName,
  userEmail,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-rose-100 flex items-start justify-between bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-700">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-rose-950 tracking-tight">
                Delete Account: Lifecycle Action
              </h3>
              <p className="text-xs font-medium text-rose-700 mt-0.5">
                Target: {userName} ({userEmail})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-rose-100/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Account deletion is not currently available</p>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                Full permanent account deletion requires specialized enterprise lifecycle support to prevent orphaned references. Destructive removal is currently locked to protect historical data integrity.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Planned Lifecycle Impact Analysis
            </h4>

            {/* Will be removed */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold text-[11px]">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                <span>Planned for removal upon account deletion:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-rose-700 text-[11px]">
                <li>Account credentials &amp; platform access authentication</li>
                <li>Personal user notifications</li>
                <li>Private user-specific draft packs</li>
                <li>Personal signature configuration profile</li>
              </ul>
            </div>

            {/* Will remain preserved */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Permanently preserved for organizational integrity:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-emerald-700 text-[11px]">
                <li>Historical reports authored by this account</li>
                <li>Historical reports received and signed by this account</li>
                <li>Published organizational templates created by this account</li>
                <li>Complete audit trail and compliance activity logs</li>
              </ul>
            </div>

            {/* Blocked dependencies */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                <span>Blocked dependencies check:</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Accounts with active template review duties or pending report signature assignments cannot be deleted until those assignments are reassigned or completed.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            Execution locked by system safeguard
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-xl bg-slate-200 text-slate-400 text-xs font-bold cursor-not-allowed"
            >
              Delete Account (Unavailable)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
