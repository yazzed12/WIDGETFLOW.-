import React from 'react';
import { Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DelegatedActionNotice: React.FC<{ action: 'Returning' | 'Rejecting' | 'Signing' }> = ({ action }) => {
  const { currentUser, authorityContext, isDelegatedMode } = useApp();
  if (!isDelegatedMode || !authorityContext?.delegation) return null;

  return (
    <div role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-[11px] text-indigo-950">
      <div className="flex items-center gap-1.5 font-bold"><Shield className="h-3.5 w-3.5" />{action} under delegated authority</div>
      <div className="mt-1">{currentUser.name} — {currentUser.role}</div>
      <div className="font-semibold">Acting as {authorityContext.authority.roleName} for {authorityContext.operationalSubject.fullName}</div>
    </div>
  );
};
