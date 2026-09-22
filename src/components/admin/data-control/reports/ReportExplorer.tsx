import React, { useState, useMemo } from 'react';
import {
  Search,
  FileSpreadsheet,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import type { ReportInstance, WidgetTemplate } from '../../../../types';
import { StatusPill } from '../common/StatusPill';
import { EmptyState } from '../common/EmptyState';
import { formatDate, resolveTemplateName, resolveUserName } from '../common/entityResolvers';
import { matchesSearch } from '../../../../features/search/searchMatcher';

interface ReportExplorerProps {
  reports: ReportInstance[];
  templates?: WidgetTemplate[];
  users?: Array<{ id: string; name?: string; full_name?: string }>;
  isLoading?: boolean;
  onSelectReport: (report: ReportInstance) => void;
  onNavigateToUser?: (userId: string) => void;
  onNavigateToTemplate?: (templateId: string) => void;
  page?: number; totalCount?: number; pageSize?: number; onPageChange?: (page: number) => void;
}

export const ReportExplorer: React.FC<ReportExplorerProps> = ({
  reports,
  templates = [],
  users = [],
  isLoading = false,
  onSelectReport,
  onNavigateToUser,
  onNavigateToTemplate,
  page = 1, totalCount = reports.length, pageSize = 25, onPageChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const searchMatches = matchesSearch(searchTerm, [
        report.displayId, report.title, report.templateName, report.createdByName,
        report.sentToName, report.categoryName, report.status,
      ]);

      const status = String(report.status || 'Draft');
      const matchesStatus = statusFilter === 'all' || status.toLowerCase() === statusFilter.toLowerCase();

      const tplId = String(report.templateId || '');
      const matchesTemplate = templateFilter === 'all' || tplId === templateFilter;

      return searchMatches && matchesStatus && matchesTemplate;
    });
  }, [reports, searchTerm, statusFilter, templateFilter]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-purple-700" />
            <span>Reports Explorer</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect submitted reports, active lifecycle states, distribution assignments, and digital signatures.
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          {filteredReports.length} of {reports.length} reports
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); onPageChange?.(1); }}
            placeholder="Search reports by name or Report ID…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
            <option value="sent">Sent</option>
            <option value="signed">Signed</option>
            <option value="returned">Returned</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Template Filter */}
          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Templates</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Data Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 space-y-3 text-center">
            <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Loading reports directory…</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <EmptyState
            title="No reports found"
            description="No reports match your current search and filter selections."
            action={
              searchTerm || statusFilter !== 'all' || templateFilter !== 'all'
                ? {
                    label: 'Clear Filters',
                    onClick: () => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setTemplateFilter('all');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 font-bold">Report Title</th>
                  <th className="py-3.5 px-4 font-bold">Creator</th>
                  <th className="py-3.5 px-4 font-bold">Template</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Recipients</th>
                  <th className="py-3.5 px-4 font-bold">Created</th>
                  <th className="py-3.5 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => {
                  const id = report.id;
                  const title = report.title || 'Untitled Report';
                  const creatorName = resolveUserName(
                    report.createdById,
                    report.createdByName,
                    users
                  );
                  const templateName = resolveTemplateName(
                    report.templateId,
                    report.templateName,
                    templates
                  );
                  const recipientCount =
                    report.assignments?.length || (report.sentToName ? 1 : 0);

                  return (
                    <tr
                      key={id}
                      onClick={() => onSelectReport(report)}
                      className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors block">
                            {title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (report.createdById && onNavigateToUser) {
                              e.stopPropagation();
                              onNavigateToUser(report.createdById);
                            }
                          }}
                          className="font-medium text-slate-700 hover:text-purple-700 hover:underline transition-colors text-left"
                        >
                          {creatorName}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (report.templateId && onNavigateToTemplate) {
                              e.stopPropagation();
                              onNavigateToTemplate(report.templateId);
                            }
                          }}
                          className="font-medium text-slate-600 hover:text-purple-700 hover:underline transition-colors text-left"
                        >
                          {templateName}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={report.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {recipientCount} recipient{recipientCount === 1 ? '' : 's'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900">
                          <span>Open Report</span>
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {onPageChange && <div className="flex items-center justify-between text-xs text-slate-500"><span>Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} reports</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Previous</button><button type="button" disabled={page * pageSize >= totalCount} onClick={() => onPageChange(page + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Next</button></div></div>}
    </div>
  );
};
