import { CheckCircle2, Clock, RotateCcw, XCircle, Send, FileCheck } from 'lucide-react';
import type { TemplateStatus, ReportStatus } from '../../types';

interface StatusBadgeProps {
  status: TemplateStatus | ReportStatus;
  type?: 'template' | 'report';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2.5 py-0.5' : 'text-xs px-3 py-1';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  switch (status) {
    // Template & Report Signed / Approved
    case 'Approved':
      return (
        <span className={`bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold rounded-full flex items-center gap-1 shrink-0 ${sizeClasses}`}>
          <CheckCircle2 className={`${iconSize} text-emerald-600`} />
          Approved
        </span>
      );
    case 'Signed':
      return (
        <span className={`bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold rounded-full flex items-center gap-1 shrink-0 ${sizeClasses}`}>
          <CheckCircle2 className={`${iconSize} text-emerald-600`} />
          Signed
        </span>
      );

    // Pending Approval / Sent
    case 'Pending Approval':
      return (
        <span className={`bg-amber-50 text-amber-700 border border-amber-200/80 font-bold rounded-full flex items-center gap-1 shrink-0 ${sizeClasses}`}>
          <Clock className={`${iconSize} text-amber-600`} />
          Pending Approval
        </span>
      );
    case 'Sent':
      return (
        <span className={`bg-blue-50 text-blue-700 border border-blue-200/80 font-bold rounded-full flex items-center gap-1 shrink-0 ${sizeClasses}`}>
          <Send className={`${iconSize} text-blue-600`} />
          Sent for Review
        </span>
      );

    // Returned / Rejected
    case 'Rejected':
      return (
        <span className={`bg-rose-50 text-rose-700 border border-rose-200/80 font-bold rounded-full flex items-center gap-1 shrink-0 ${sizeClasses}`}>
          <XCircle className={`${iconSize} text-rose-600`} />
          Rejected
        </span>
      );
    case 'Returned':
      return (
        <span className={`bg-rose-50 text-rose-700 border border-rose-200/80 font-bold rounded-full flex items-center gap-1 shrink-0 ${sizeClasses}`}>
          <RotateCcw className={`${iconSize} text-rose-600`} />
          {type === 'template' ? 'Returned for Revision' : 'Returned'}
        </span>
      );

    // Completed
    case 'Completed':
      return (
        <span className={`bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold rounded-full flex items-center gap-1 shrink-0 ${sizeClasses}`}>
          <FileCheck className={`${iconSize} text-indigo-600`} />
          Completed
        </span>
      );

    // Draft
    case 'Draft':
    default:
      return (
        <span className={`bg-slate-100 text-slate-700 border border-slate-300/80 font-bold rounded-full flex items-center gap-1 shrink-0 ${sizeClasses}`}>
          <Clock className={`${iconSize} text-slate-500`} />
          Draft
        </span>
      );
  }
};
