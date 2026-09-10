import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`p-10 text-center flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-xs ${className}`}
    >
      <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-400 mb-3.5">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h4 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h4>
      <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors shadow-xs cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
