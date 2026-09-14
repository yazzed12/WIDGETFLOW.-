import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface QuickAction {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  visible: boolean;
  badge?: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  const visibleActions = actions.filter((action) => action.visible);

  if (visibleActions.length === 0) return null;

  return (
    <section
      aria-labelledby="dashboard-quick-actions"
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2
          id="dashboard-quick-actions"
          className="font-bold text-slate-800 uppercase tracking-wider text-[11px]"
        >
          Quick Actions
        </h2>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Common workspace shortcuts
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {visibleActions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              type="button"
              onClick={action.onClick}
              className="group text-left rounded-lg border border-slate-200 bg-slate-50/60 p-3 transition-all hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 cursor-pointer"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-indigo-600 flex items-center justify-center transition-colors group-hover:bg-indigo-100 group-hover:border-indigo-200">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                {action.badge && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                    {action.badge}
                  </span>
                )}
              </span>
              <span className="block mt-2 text-sm font-semibold text-slate-800">
                {action.title}
              </span>
              <span className="block mt-0.5 text-[11px] leading-relaxed text-slate-500">
                {action.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
