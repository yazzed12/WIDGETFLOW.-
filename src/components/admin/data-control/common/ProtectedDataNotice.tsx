import React from 'react';
import { LockKeyhole } from 'lucide-react';

interface ProtectedDataNoticeProps {
  title?: string;
  description?: string;
  reason?: 'access_control' | 'system_integrity' | 'audit_history' | 'active_workflow';
  compact?: boolean;
  className?: string;
}

const REASONS = {
  access_control: 'This information is protected from deletion because it is required for user authorization and access control governance.',
  system_integrity: 'Some records are protected because they are required for system stability, security, or foundational platform configurations.',
  audit_history: 'Historical records are permanently preserved to maintain an immutable compliance and accountability trail.',
  active_workflow: 'This record is protected while active workflow cycles and required approvals are being processed.',
};

export const ProtectedDataNotice: React.FC<ProtectedDataNoticeProps> = ({
  title = 'Protected Record Safeguard',
  description,
  reason = 'system_integrity',
  compact = false,
  className = '',
}) => {
  const text = description || REASONS[reason];

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] font-medium text-amber-900 ${className}`}
      >
        <LockKeyhole className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>{text}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-950 flex items-start gap-3.5 ${className}`}
    >
      <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
        <LockKeyhole className="w-4 h-4" />
      </div>
      <div className="space-y-1">
        <p className="font-bold text-amber-900">{title}</p>
        <p className="text-amber-800 leading-relaxed">{text}</p>
      </div>
    </div>
  );
};
