import React from 'react';
import {
  Users,
  FileCode2,
  FileSpreadsheet,
  ChevronRight,
  Database,
} from 'lucide-react';
import type { DataControlDomainKey } from '../navigation/DataControlNavigation';

interface DataControlOverviewProps {
  summaryCounts: Record<string, number>;
  onNavigate: (domain: DataControlDomainKey) => void;
}

export const DataControlOverview: React.FC<DataControlOverviewProps> = ({
  summaryCounts,
  onNavigate,
}) => {
  const getCount = (key: string) => summaryCounts[key] ?? 0;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Title & Introduction */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">
          <Database className="w-4 h-4" />
          <span>WidgetFlow Control Plane</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Data Control Center
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
          The Protected Administrator's central interface for understanding, exploring, tracing, and managing all application records across WidgetFlow.
        </p>
      </div>

      {/* Primary Explorer Entry Points (3 Core Business Pillars) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Accounts Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-slate-900">
                {getCount('accounts').toLocaleString()}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-4">Accounts Directory</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Explore user profiles, department assignments, owned reports, created templates, and manage account data.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">
              {getCount('roles')} Roles · {getCount('permissions')} Permissions
            </span>
            <button
              type="button"
              onClick={() => onNavigate('accounts')}
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
            >
              <span>Explore Accounts</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Templates Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-700">
                <FileCode2 className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-slate-900">
                {getCount('templates').toLocaleString()}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-4">Templates &amp; Content</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Inspect live form layouts, section configurations, field definitions, version snapshots, and template usage.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">
              {getCount('categories')} Categories · {getCount('template_versions')} Versions
            </span>
            <button
              type="button"
              onClick={() => onNavigate('templates')}
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
            >
              <span>Explore Templates</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reports Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-slate-900">
                {getCount('reports').toLocaleString()}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-4">Reports &amp; Lifecycles</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Inspect submitted form data, recipient distribution cycles, digital signatures, and historical audit events.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">
              {getCount('report_assignments')} Recipients · {getCount('report_send_cycles')} Cycles
            </span>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
            >
              <span>Explore Reports</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grouped Information Snapshot Tables / Sections */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
          Domain Breakdown &amp; Direct Navigation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* People & Governance Section */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                People &amp; Access Governance
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {getCount('accounts') + getCount('roles')} records
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div
                onClick={() => onNavigate('accounts')}
                className="py-3 flex items-center justify-between hover:text-purple-700 cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-purple-700">User Accounts</p>
                  <p className="text-[11px] text-slate-500">Active accounts and user-owned data</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {getCount('accounts').toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div
                onClick={() => onNavigate('roles')}
                className="py-3 flex items-center justify-between hover:text-purple-700 cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-900 group-hover:text-purple-700">System Roles</p>
                    <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200/60">
                      Protected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Organizational hierarchy and role assignments</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {getCount('roles').toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div
                onClick={() => onNavigate('permissions')}
                className="py-3 flex items-center justify-between hover:text-purple-700 cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-900 group-hover:text-purple-700">Core Permissions</p>
                    <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200/60">
                      Protected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Access catalog definitions and assignments</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {getCount('permissions').toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Content & Packages Section */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Content &amp; Standard Packs
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {getCount('templates') + getCount('categories')} records
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div
                onClick={() => onNavigate('templates')}
                className="py-3 flex items-center justify-between hover:text-purple-700 cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-purple-700">Form Templates</p>
                  <p className="text-[11px] text-slate-500">Active and draft templates</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {getCount('templates').toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div
                onClick={() => onNavigate('categories')}
                className="py-3 flex items-center justify-between hover:text-purple-700 cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-purple-700">Categories</p>
                  <p className="text-[11px] text-slate-500">Organizational taxonomy for templates</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {getCount('categories').toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div
                onClick={() => onNavigate('standard_packs')}
                className="py-3 flex items-center justify-between hover:text-purple-700 cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-purple-700">Standard Packs</p>
                  <p className="text-[11px] text-slate-500">Bundled forms and pre-built operational components</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {getCount('standard_packs').toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Files & Media Section */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Media, Storage &amp; Alerts
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {getCount('assets') + getCount('notifications')} records
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div
                onClick={() => onNavigate('assets')}
                className="py-3 flex items-center justify-between hover:text-purple-700 cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-purple-700">Asset Storage</p>
                  <p className="text-[11px] text-slate-500">Uploaded documents, signatures, and media</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {getCount('assets').toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div
                onClick={() => onNavigate('notifications')}
                className="py-3 flex items-center justify-between hover:text-purple-700 cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-purple-700">System Notifications</p>
                  <p className="text-[11px] text-slate-500">Alerts delivered across the organization</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {getCount('notifications').toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* History & Compliance Section */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Compliance &amp; History
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {getCount('audit_data').toLocaleString()} records
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div
                onClick={() => onNavigate('audit')}
                className="py-3 flex items-center justify-between hover:text-purple-700 cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-900 group-hover:text-purple-700">Audit History</p>
                    <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200/60">
                      Immutable
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Security, administrative, and data change logs</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {getCount('audit_data').toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div
                onClick={() => onNavigate('system_reset')}
                className="py-3 flex items-center justify-between hover:text-purple-700 cursor-pointer group"
              >
                <div>
                  <p className="font-bold text-slate-900 group-hover:text-purple-700">System Reset</p>
                  <p className="text-[11px] text-slate-500">Review application-data reset readiness</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {getCount('workflow_runtime_data').toLocaleString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
