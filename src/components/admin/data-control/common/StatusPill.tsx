import React from 'react';
import { LockKeyhole } from 'lucide-react';

interface StatusPillProps {
  status?: string | null;
  type?: 'status' | 'role' | 'protection' | 'danger';
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  type = 'status',
  className = '',
  size = 'md',
}) => {
  if (!status) return <span className="text-slate-400">—</span>;

  const s = status.toLowerCase();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  if (type === 'protection' || s === 'protected') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses} ${className}`}
      >
        <LockKeyhole className="w-3 h-3 text-amber-600 shrink-0" />
        Protected
      </span>
    );
  }

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (s === 'active' || s === 'approved' || s === 'signed' || s === 'published') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
  } else if (s === 'pending' || s === 'in_review' || s === 'pending_approval' || s === 'review') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200/80';
  } else if (s === 'draft' || s === 'returned') {
    colorClasses = 'bg-sky-50 text-sky-800 border-sky-200/80';
  } else if (s === 'sent' || s === 'completed') {
    colorClasses = 'bg-purple-50 text-purple-800 border-purple-200/80';
  } else if (s === 'rejected' || s === 'inactive' || s === 'deactivated' || s === 'critical') {
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-200/80';
  } else if (s === 'system') {
    colorClasses = 'bg-indigo-50 text-indigo-800 border-indigo-200/80';
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${colorClasses} ${sizeClasses} ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
