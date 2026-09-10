import React, { useState, useMemo } from 'react';
import {
  Search,
  FileCode2,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import type { WidgetTemplate, Category } from '../../../../types';
import { StatusPill } from '../common/StatusPill';
import { EmptyState } from '../common/EmptyState';
import { formatDate, resolveCategoryName, resolveUserName } from '../common/entityResolvers';

interface TemplateExplorerProps {
  templates: WidgetTemplate[];
  categories?: Category[];
  users?: Array<{ id: string; name?: string; full_name?: string }>;
  isLoading?: boolean;
  onSelectTemplate: (template: WidgetTemplate) => void;
  onNavigateToUser?: (userId: string) => void;
}

export const TemplateExplorer: React.FC<TemplateExplorerProps> = ({
  templates,
  categories = [],
  users = [],
  isLoading = false,
  onSelectTemplate,
  onNavigateToUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const name = (template.name || '').toLowerCase();
      const desc = (template.description || '').toLowerCase();
      const term = searchTerm.toLowerCase().trim();

      const matchesSearch = !term || name.includes(term) || desc.includes(term);

      const status = String(template.status || 'Draft');
      const matchesStatus = statusFilter === 'all' || status.toLowerCase() === statusFilter.toLowerCase();

      const catId = String(template.categoryId || '');
      const matchesCategory = categoryFilter === 'all' || catId === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [templates, searchTerm, statusFilter, categoryFilter]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-purple-700" />
            <span>Templates Explorer</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore, inspect full layouts, view revision snapshots, and audit usage across all templates.
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          {filteredTemplates.length} of {templates.length} templates
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search templates by title, description, or keyword…"
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
            <option value="approved">Approved</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Data Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 space-y-3 text-center">
            <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Loading templates directory…</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            title="No templates found"
            description="No templates match your search and filter criteria."
            action={
              searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? {
                    label: 'Clear Filters',
                    onClick: () => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setCategoryFilter('all');
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
                  <th className="py-3.5 px-4 font-bold">Template</th>
                  <th className="py-3.5 px-4 font-bold">Category</th>
                  <th className="py-3.5 px-4 font-bold">Creator</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Version</th>
                  <th className="py-3.5 px-4 font-bold">Updated</th>
                  <th className="py-3.5 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.map((template) => {
                  const id = template.id;
                  const name = template.name || 'Untitled Template';
                  const categoryName = resolveCategoryName(
                    template.categoryId,
                    (template as any).categoryName,
                    categories
                  );
                  const creatorName = resolveUserName(
                    template.createdById,
                    template.createdByName,
                    users
                  );
                  const version = template.version ?? '1';

                  return (
                    <tr
                      key={id}
                      onClick={() => onSelectTemplate(template)}
                      className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-purple-50 text-purple-700 shrink-0">
                            <FileCode2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors block">
                              {name}
                            </span>
                            {template.description && (
                              <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                                {template.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{categoryName}</td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (template.createdById && onNavigateToUser) {
                              e.stopPropagation();
                              onNavigateToUser(template.createdById);
                            }
                          }}
                          className="font-medium text-slate-700 hover:text-purple-700 hover:underline transition-colors text-left"
                        >
                          {creatorName}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={template.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">v{version}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {formatDate(template.updatedAt)}
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
        )}
      </div>
    </div>
  );
};
