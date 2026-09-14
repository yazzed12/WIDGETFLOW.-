import React, { useState } from 'react';
import type { ReportInstance } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, RotateCcw, AlertCircle } from 'lucide-react';

interface ReturnReportModalProps {
  report: ReportInstance;
  onClose: () => void;
}

export const ReturnReportModal: React.FC<ReturnReportModalProps> = ({ report, onClose }) => {
  const { returnReport } = useApp();
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      setError('Please provide feedback explaining what needs to be changed.');
      return;
    }

    returnReport(report.id, feedback.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-scale-up">
        {/* Header */}
        <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-600 text-white rounded-lg shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-rose-950">Return Report for Changes</h2>
              <p className="text-xs text-rose-700">{report.title}{report.displayId ? ` · ${report.displayId}` : ''}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Requested Revisions & Feedback <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (error) setError('');
              }}
              placeholder="Explain what should be updated before signing (e.g., Please update the incident summary and verify revenue variance numbers)..."
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                error ? 'border-rose-400 ring-rose-500/20' : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-500'
              }`}
            />
            {error && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return Report</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
