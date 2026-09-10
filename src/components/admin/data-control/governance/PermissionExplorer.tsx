import React, { useState } from 'react';
import { KeyRound, Search, ChevronRight, X } from 'lucide-react';
import { PERMISSION_GROUPS } from '../../../../shared/permissionCatalog';
import { StatusPill } from '../common/StatusPill';
import { ProtectedDataNotice } from '../common/ProtectedDataNotice';

interface FlatPermission {
  key: string;
  label: string;
  group: string;
}

export const PermissionExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerm, setSelectedPerm] = useState<FlatPermission | null>(null);

  const flatPermissions: FlatPermission[] = [];
  PERMISSION_GROUPS.forEach((g: any) => {
    if (Array.isArray(g?.permissions)) {
      g.permissions.forEach((permItem: any) => {
        const key = String(permItem[0] || '');
        const label = String(permItem[1] || key);
        flatPermissions.push({
          key,
          label,
          group: g.label || 'General',
        });
      });
    }
  });

  const filtered = flatPermissions.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    return !term || p.key.toLowerCase().includes(term) || p.label.toLowerCase().includes(term) || p.group.toLowerCase().includes(term);
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-purple-700" />
          <span>Permissions Catalog Inspector</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Read-only inspection of system permission keys, operational capabilities, and governance boundaries.
        </p>
      </div>

      <ProtectedDataNotice
        title="Protected Security Catalog"
        description="Core permission keys are protected platform definitions and cannot be destructively altered."
        reason="access_control"
      />

      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search permissions by key, capability name, or group…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4 font-bold">Permission Capability</th>
              <th className="py-3.5 px-4 font-bold">Permission Key</th>
              <th className="py-3.5 px-4 font-bold">Category Group</th>
              <th className="py-3.5 px-4 font-bold">Protection</th>
              <th className="py-3.5 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((perm) => (
              <tr
                key={perm.key}
                onClick={() => setSelectedPerm(perm)}
                className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-purple-700">
                  {perm.label}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">{perm.key}</td>
                <td className="py-3.5 px-4 text-slate-600 font-medium">{perm.group}</td>
                <td className="py-3.5 px-4">
                  <StatusPill status="protected" type="protection" size="sm" />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900">
                    <span>Inspect</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {selectedPerm && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-30 overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">{selectedPerm.label}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedPerm.key}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPerm(null)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <ProtectedDataNotice
              compact
              reason="access_control"
              description="Protected: This capability key is required for platform security rules."
            />

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Domain Group</span>
                <span className="font-bold text-slate-800">{selectedPerm.group}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Catalog Status</span>
                <span className="font-bold text-emerald-700">Active Specification</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
