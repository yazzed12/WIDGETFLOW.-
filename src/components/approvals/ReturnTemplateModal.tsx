import React, { useState } from 'react';
import { X, RotateCcw, AlertCircle } from 'lucide-react';
import type { WidgetTemplate } from '../../types';

interface ReturnTemplateModalProps {
  template: WidgetTemplate;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export const ReturnTemplateModal: React.FC<ReturnTemplateModalProps> = ({ template, onConfirm, onClose }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please provide a reason for returning this template for revision.');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
        <div className="p-5 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 text-white rounded-lg shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-950">Return Template for Revision</h2>
              <p className="text-xs text-amber-700">{template.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-amber-500 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <p className="text-slate-700 font-medium leading-relaxed">
            Send <strong className="text-slate-900">"{template.name}"</strong> back to <strong className="text-slate-900">{template.createdByName}</strong> for corrections.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Revision reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(event) => { setReason(event.target.value); if (error) setError(''); }}
              placeholder="Explain what should be corrected before resubmission..."
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 transition-all ${error ? 'border-rose-400 ring-rose-500/20' : 'border-slate-200 focus:ring-amber-500/20 focus:border-amber-500'}`}
            />
            {error && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
          </div>
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"><RotateCcw className="w-4 h-4" /><span>Return for Revision</span></button>
          </div>
        </form>
      </div>
    </div>
  );
};
