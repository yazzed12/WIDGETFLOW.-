import React, { useState } from 'react';
import { Trash2, CheckCircle2, ShieldAlert, X } from 'lucide-react';

interface ReviewChangesDialogProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  targetName?: string;
  willRemove: Array<{ label: string; count?: number | string }>;
  willRemain: Array<{ label: string; count?: number | string }>;
  confirmationPhrase?: string;
  isExecuting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ReviewChangesDialog: React.FC<ReviewChangesDialogProps> = ({
  isOpen,
  title = 'Review Changes',
  description,
  targetName,
  willRemove,
  willRemain,
  confirmationPhrase,
  isExecuting = false,
  onConfirm,
  onClose,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');

  if (!isOpen) return null;

  const requiresConfirmation = Boolean(confirmationPhrase);
  const isConfirmed = !requiresConfirmation || typedConfirmation.trim() === confirmationPhrase;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">{title}</h3>
              {targetName && (
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Target: {targetName}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {description && (
            <p className="text-slate-600 leading-relaxed text-xs">{description}</p>
          )}

          {/* Will Be Removed */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-rose-900 font-bold uppercase tracking-wider text-[10px]">
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Will be removed</span>
            </div>
            <ul className="space-y-1.5 pl-5 list-disc text-rose-800">
              {willRemove.map((item, idx) => (
                <li key={idx} className="font-medium">
                  {item.label}
                  {item.count !== undefined && (
                    <span className="font-bold ml-1.5 text-rose-950">({item.count})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Will Remain Preserved */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-900 font-bold uppercase tracking-wider text-[10px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Will remain preserved</span>
            </div>
            <ul className="space-y-1.5 pl-5 list-disc text-emerald-800">
              {willRemain.map((item, idx) => (
                <li key={idx} className="font-medium">
                  {item.label}
                  {item.count !== undefined && (
                    <span className="font-bold ml-1.5 text-emerald-950">({item.count})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Type Confirmation Input if needed */}
          {requiresConfirmation && (
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-bold text-slate-700">
                To proceed, type{' '}
                <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 text-rose-600 border border-slate-200 select-all">
                  {confirmationPhrase}
                </span>{' '}
                below:
              </label>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder={confirmationPhrase}
                disabled={isExecuting}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:border-purple-500 focus:outline-hidden"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isConfirmed || isExecuting}
            className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-40 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            {isExecuting ? (
              <span>Applying changes…</span>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm &amp; Execute</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
