import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { matchesSearch } from '../features/search/searchMatcher';
import { DateSearchFilter } from '../features/search/components/DateSearchFilter';
import { matchesDateRange } from '../features/search/dateRangeFilter';
import type { DateSearchFilterValue } from '../features/search/dateRangeFilter';
import { formatDateTime } from '../shared/dateTime';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  FileSpreadsheet,
  Send,
  Search,
  Filter,
  Eye,
  User as UserIcon,
  RotateCcw,
  Shield,
  FileCheck,
  Edit3,
  XCircle,
} from 'lucide-react';

type TabType = 'My Reports' | 'Received' | 'Draft' | 'Awaiting Signature' | 'Signed' | 'Rejected';

export const ReportsPage: React.FC = () => {
  const {
    reports,
    currentUser,
    templates,
    setActiveView,
    openReportViewModal,
    openSendReportModal,
    openReturnReportModal,
    openSignReportModal,
    openRejectReportModal,
    openFillReportModal,
    markReportCompleted,
    hasPermission,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('My Reports');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateSearchFilterValue | null>(null);

  // Tab Filtering Logic
  const getTabReports = (tab: TabType) => {
    switch (tab) {
      case 'My Reports':
        return reports.filter((r) => r.createdById === currentUser.id);
      case 'Received':
        return reports.filter((r) => r.assignments?.some((a) => a.recipientUserId === currentUser.id) || r.sentToId === currentUser.id);
      case 'Draft':
        return reports.filter((r) => r.createdById === currentUser.id && r.status === 'Draft');
      case 'Awaiting Signature':
        return reports.filter((r) => (r.assignments?.some((a) => a.recipientUserId === currentUser.id) || r.sentToId === currentUser.id) && r.status === 'Sent');
      case 'Signed':
        return reports.filter(
          (r) =>
            (r.createdById === currentUser.id || r.assignments?.some((a) => a.recipientUserId === currentUser.id) || r.sentToId === currentUser.id || hasPermission('reports.view_organization')) &&
            r.status === 'Signed'
        );
      case 'Rejected':
        return reports.filter(
          (r) =>
            (r.createdById === currentUser.id || r.assignments?.some((a) => a.recipientUserId === currentUser.id) || r.sentToId === currentUser.id || hasPermission('reports.view_organization')) &&
            r.status === 'Rejected'
        );
      default:
        return reports;
    }
  };

  const currentTabReports = getTabReports(activeTab);

  const filteredReports = useMemo(() => currentTabReports.filter((r) => matchesDateRange(r.createdAt, dateFilter) && matchesSearch(searchTerm, [
    r.displayId, r.title, r.templateName, r.createdByName, r.sentToName,
    r.categoryName, r.status, r.returnReason, r.rejectionReason,
  ])), [currentTabReports, searchTerm, dateFilter]);

  const tabs: TabType[] = ['My Reports', 'Received', 'Draft', 'Awaiting Signature', 'Signed', 'Rejected'];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Reports Distribution & Signatures
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track, complete, send for review, and digitally sign generated reports.
          </p>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {tabs.map((tab) => {
            const count = getTabReports(tab).length;
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-2 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="flex w-full md:w-auto items-center gap-2">
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reports by name or Report ID…"
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <DateSearchFilter value={dateFilter} onChange={setDateFilter} />
        </div>
      </div>

      {/* Reports Data Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3 shadow-xs">
            <Filter className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">No reports found under {activeTab}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === 'Received' || activeTab === 'Awaiting Signature'
                ? 'You currently have no report reviews assigned to your user account.'
                : 'Start by selecting an approved report template from the library.'}
            </p>
            <button
              onClick={() => setActiveView('templates')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Browse Report Templates</span>
            </button>
          </div>
        ) : (
          filteredReports.map((rep) => {
            const isAuthor = rep.createdById === currentUser.id;
            const isSupabaseReport = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(rep.id);
            const isSupabaseActionableRecipient = rep.assignments?.some((a) => a.recipientUserId === currentUser.id && (!rep.currentSendCycleId || a.sendCycleId === rep.currentSendCycleId) && a.assignmentStatus === 'pending' && rep.signatureAssignments?.some((m) => m.reportAssignmentId === a.id && m.recipientUserId === currentUser.id && m.sendCycleId === rep.currentSendCycleId));
            const isAssignedRecipient = isSupabaseReport ? isSupabaseActionableRecipient : (rep.assignments?.some((a) => a.recipientUserId === currentUser.id) || rep.sentToId === currentUser.id);
            const tpl = templates.find((t) => t.id === rep.templateId);

            return (
              <div
                key={rep.id}
                onClick={() => openReportViewModal(rep)}
                className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
              >
                {/* Left Metadata */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {rep.title}
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {rep.categoryName}
                    </span>
                  </div>
                  {rep.displayId && <div className="text-[11px] font-mono text-slate-400">{rep.displayId}</div>}

                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                    <span>Template: <strong className="text-slate-700">{rep.templateName}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-slate-400" />
                      Author: {rep.createdByName}
                    </span>
                    {rep.sentToName && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-700 font-semibold">Sent to: {rep.sentToName}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>Created: {formatDateTime(rep.createdAt)}</span>
                  </div>

                  {/* Return reason snippet if returned */}
                  {rep.status === 'Returned' && (
                    <div className="mt-1 text-[11px] text-rose-700 font-medium bg-rose-50 p-2 rounded border border-rose-200 w-fit">
                      Feedback: "{rep.returnReason}"
                    </div>
                  )}
                  {rep.status === 'Rejected' && rep.rejectionReason && (
                    <div className="mt-1 text-[11px] text-rose-700 font-medium bg-rose-50 p-2 rounded border border-rose-200 w-fit max-w-full line-clamp-2">
                      Reason: {rep.rejectionReason}
                    </div>
                  )}

                  {/* Signature details snippet if signed */}
                  {rep.status === 'Signed' && rep.signature && (
                    <div className="mt-1 text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 w-fit flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      Signed by {rep.signature.signedByName} ({rep.signature.signedByRole}) • {rep.signature.verificationId}
                    </div>
                  )}
                </div>

                {/* Right Status & Action Buttons */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <div>
                    <StatusBadge status={rep.status} />
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Author Actions */}
                    {isAuthor && rep.status !== 'Signed' && (
                      <>
                        {(rep.status === 'Draft' || rep.status === 'Returned') && tpl && hasPermission('reports.edit_draft') && (
                          <button
                            onClick={() => openFillReportModal(tpl, rep)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}

                        {rep.status === 'Draft' && hasPermission('reports.complete') && (
                          <button
                            onClick={() => markReportCompleted(rep.id)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Complete</span>
                          </button>
                        )}

                        {(rep.status === 'Completed' || rep.status === 'Returned') && hasPermission('reports.send') && (
                          <button
                            onClick={() => openSendReportModal(rep)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{rep.status === 'Returned' ? 'Resend' : 'Send'}</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Recipient Review Actions */}
                    {isAssignedRecipient && rep.status === 'Sent' && (
                      <>
                        {hasPermission('reports.return') && <button
                          onClick={() => openReturnReportModal(rep)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Return</span>
                        </button>}
                        {hasPermission('reports.reject') && <button onClick={() => openRejectReportModal(rep)} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"><XCircle className="w-3.5 h-3.5" /><span>Reject</span></button>}
                        {hasPermission('reports.sign') && (!isSupabaseReport || rep.signatureAssignments?.some((mapping) => mapping.recipientUserId === currentUser.id && mapping.sendCycleId === rep.currentSendCycleId)) && <button
                          onClick={() => openSignReportModal(rep)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Sign</span>
                        </button>}
                      </>
                    )}

                    {/* Inspect View Data Button */}
                    <button
                      onClick={() => openReportViewModal(rep)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
