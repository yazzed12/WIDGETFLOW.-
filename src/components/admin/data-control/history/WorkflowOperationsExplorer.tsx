import React from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';

export const WorkflowOperationsExplorer: React.FC = () => {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-700" />
          <span>Workflow Operations</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Operational records created while multi-step approval workflows, background task queues, and automated events are processed.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3.5">
          <Activity className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Active Workflow Operations</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
          All workflow queues are clear. Operational records are created automatically when background workflow cycles or automated tasks are in flight.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Workflow processing engines operational</span>
        </div>
      </div>
    </div>
  );
};
