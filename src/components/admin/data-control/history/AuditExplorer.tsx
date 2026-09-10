import React, { useEffect, useState } from 'react';
import { History, Search, ChevronRight, X } from 'lucide-react';
import { formatDate } from '../common/entityResolvers';
import { ProtectedDataNotice } from '../common/ProtectedDataNotice';
import { adminService } from '../../../../features/admin/services/adminService';

interface AuditRecord {
  id: string;
  actor_name?: string;
  actor_user_id?: string;
  action: string;
  record_type?: string;
  record_name?: string;
  timestamp?: string;
  created_at?: string;
  result?: string;
  details?: Record<string, unknown>;
}

export const AuditExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);

  useEffect(() => {
    adminService.audit().then((records) => setAuditLogs(records.map((record) => ({
      id: record.id,
      actor_name: record.actor_name,
      action: record.action,
      record_type: record.actor_role || 'System',
      record_name: record.target || '—',
      timestamp: record.timestamp,
      result: 'Recorded',
      details: { previous_value: record.previous_value, new_value: record.new_value },
    })))).catch(() => setAuditLogs([]));
  }, []);

  const filtered = auditLogs.filter((a) => {
    const term = searchTerm.toLowerCase().trim();
    return !term || a.action.toLowerCase().includes(term) || (a.actor_name || '').toLowerCase().includes(term);
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-purple-700" />
          <span>Audit History Explorer</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable audit trail documenting administrative actions, security checks, and data lifecycle events.
        </p>
      </div>

      <ProtectedDataNotice
        title="Immutable Audit Compliance Log"
        description="Audit events are permanently preserved for accountability and cannot be edited or cleared."
        reason="audit_history"
      />

      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit records by actor or action…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4 font-bold">Actor</th>
              <th className="py-3.5 px-4 font-bold">Action</th>
              <th className="py-3.5 px-4 font-bold">Domain</th>
              <th className="py-3.5 px-4 font-bold">Record</th>
              <th className="py-3.5 px-4 font-bold">Result</th>
              <th className="py-3.5 px-4 font-bold">Timestamp</th>
              <th className="py-3.5 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center text-xs text-slate-500">
                  No audit events are available from the current read contract.
                </td>
              </tr>
            ) : filtered.map((log) => (
              <tr
                key={log.id}
                onClick={() => setSelectedAudit(log)}
                className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-purple-700">
                  {log.actor_name || 'System'}
                </td>
                <td className="py-3.5 px-4 font-semibold text-slate-800">{log.action}</td>
                <td className="py-3.5 px-4 text-slate-600 font-medium">{log.record_type}</td>
                <td className="py-3.5 px-4 text-slate-600">{log.record_name}</td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    {log.result || 'Success'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-500 font-medium">
                  {formatDate(log.timestamp, true)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900">
                    <span>Details</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {selectedAudit && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-30 overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">{selectedAudit.action}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedAudit.id}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAudit(null)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Actor</span>
                <span className="font-bold text-slate-800">{selectedAudit.actor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Domain</span>
                <span className="font-bold text-slate-800">{selectedAudit.record_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Timestamp</span>
                <span className="text-slate-700 font-medium">
                  {formatDate(selectedAudit.timestamp, true)}
                </span>
              </div>
            </div>

            {selectedAudit.details && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Event Technical Payload
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {JSON.stringify(selectedAudit.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
