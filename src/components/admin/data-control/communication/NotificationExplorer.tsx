import React, { useState } from 'react';
import { Bell, Trash2, Search, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { formatDate, resolveUserName } from '../common/entityResolvers';
import { ReviewChangesDialog } from '../common/ReviewChangesDialog';
import { adminDataControlService } from '../../../../features/admin/services/adminDataControlService';
import { useApp } from '../../../../context/AppContext';

export interface NotificationRecord {
  id: string;
  recipient_user_id?: string;
  userId?: string;
  title: string;
  message?: string;
  notification_type?: string;
  type?: string;
  is_read?: boolean;
  read?: boolean;
  created_at?: string;
  createdAt?: string;
  related_template_id?: string;
  related_report_id?: string;
}

interface NotificationExplorerProps {
  notifications: NotificationRecord[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onNavigateToReport?: (reportId: string) => void;
  onNavigateToTemplate?: (templateId: string) => void;
  page?: number; totalCount?: number; pageSize?: number; onPageChange?: (page: number) => void;
}

export const NotificationExplorer: React.FC<NotificationExplorerProps> = ({
  notifications,
  onRefresh,
  onNavigateToReport,
  onNavigateToTemplate,
  page = 1, totalCount = notifications.length, pageSize = 25, onPageChange,
}) => {
  const { users = [] } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = notifications.filter((n) => {
    const term = searchTerm.toLowerCase().trim();
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    return !term || title.includes(term) || msg.includes(term);
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((n) => n.id));
    }
  };

  const handleExecuteCleanup = async () => {
    if (selectedIds.length === 0) return;
    setIsExecuting(true);
    setNotice(null);
    try {
      await adminDataControlService.executeCleanup(
        'notifications',
        selectedIds,
        'DELETE SELECTED NOTIFICATIONS'
      );
      setNotice(`Successfully deleted ${selectedIds.length} notifications.`);
      setSelectedIds([]);
      setIsReviewOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to delete notifications.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-700" />
            <span>Notifications Explorer</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect delivered alerts, review recipient notifications, and perform safe notification batch cleanup.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Review Removal ({selectedIds.length})</span>
          </button>
        )}
      </div>
      {onPageChange && <div className="flex items-center justify-between text-xs text-slate-500"><span>Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} notifications</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Previous</button><button type="button" disabled={page * pageSize >= totalCount} onClick={() => onPageChange(page + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Next</button></div></div>}

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Search and Batch Actions */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); onPageChange?.(1); }}
            placeholder="Search notifications by title or message…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500"
          />
        </div>
        <button
          type="button"
          onClick={selectAll}
          className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
        >
          {selectedIds.length === filtered.length ? 'Deselect All' : 'Select Visible'}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
                  onChange={selectAll}
                  className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  aria-label="Select all notifications"
                />
              </th>
              <th className="py-3.5 px-4 font-bold">Recipient</th>
              <th className="py-3.5 px-4 font-bold">Notification Title</th>
              <th className="py-3.5 px-4 font-bold">Type</th>
              <th className="py-3.5 px-4 font-bold">Read Status</th>
              <th className="py-3.5 px-4 font-bold">Sent Date</th>
              <th className="py-3.5 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((notif) => {
              const recUserId = notif.recipient_user_id || notif.userId;
              const recipientName = resolveUserName(recUserId, null, users);
              const isRead = notif.is_read ?? notif.read ?? false;
              const isChecked = selectedIds.includes(notif.id);

              return (
                <tr
                  key={notif.id}
                  onClick={() => setSelectedNotif(notif)}
                  className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(notif.id)}
                      className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      aria-label={`Select notification ${notif.title}`}
                    />
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{recipientName}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 group-hover:text-purple-700 block">
                      {notif.title}
                    </span>
                    {notif.message && (
                      <span className="text-[11px] text-slate-400 truncate max-w-sm block">
                        {notif.message}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                    {notif.notification_type || notif.type || 'system'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isRead ? 'bg-slate-100 text-slate-500' : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {isRead ? 'Read' : 'Unread'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-medium">
                    {formatDate(notif.created_at || notif.createdAt, true)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900">
                      <span>Inspect</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {selectedNotif && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-30 overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">{selectedNotif.title}</h3>
                <p className="text-xs text-slate-400">
                  {selectedNotif.notification_type || selectedNotif.type || 'Alert'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNotif(null)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Message Body
              </span>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                {selectedNotif.message || 'No additional message details.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Recipient</span>
                <span className="font-bold text-slate-800">
                  {resolveUserName(selectedNotif.recipient_user_id || selectedNotif.userId, null, users)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Delivered Timestamp</span>
                <span className="text-slate-700 font-medium">
                  {formatDate(selectedNotif.created_at || selectedNotif.createdAt, true)}
                </span>
              </div>
            </div>

            {selectedNotif.related_report_id && onNavigateToReport && (
              <button
                type="button"
                onClick={() => {
                  const rId = selectedNotif.related_report_id!;
                  setSelectedNotif(null);
                  onNavigateToReport(rId);
                }}
                className="w-full p-3 rounded-2xl border border-purple-200 bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-between hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <span>Open Related Report</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {selectedNotif.related_template_id && onNavigateToTemplate && (
              <button
                type="button"
                onClick={() => {
                  const tId = selectedNotif.related_template_id!;
                  setSelectedNotif(null);
                  onNavigateToTemplate(tId);
                }}
                className="w-full p-3 rounded-2xl border border-purple-200 bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-between hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <span>Open Related Template</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Review Changes Dialog */}
      <ReviewChangesDialog
        isOpen={isReviewOpen}
        title="Review Notification Removal"
        description="Permanently delete the selected notifications. Historical reports and user accounts will remain preserved."
        willRemove={[
          {
            label: 'Selected personal notifications',
            count: selectedIds.length,
          },
        ]}
        willRemain={[
          { label: 'User accounts & identity' },
          { label: 'Reports and form submissions' },
          { label: 'System audit logs' },
        ]}
        confirmationPhrase="DELETE SELECTED NOTIFICATIONS"
        isExecuting={isExecuting}
        onConfirm={handleExecuteCleanup}
        onClose={() => setIsReviewOpen(false)}
      />
    </div>
  );
};
