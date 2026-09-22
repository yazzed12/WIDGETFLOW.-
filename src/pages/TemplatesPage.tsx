import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TemplateCard } from '../components/templates/TemplateCard';
import {
  Plus,
  Search,
  Filter,
  Sparkles,
  LayoutGrid,
  List,
  DollarSign,
  Users,
  BarChart3,
  Terminal,
  Layers,
  Eye,
  FileText,
} from 'lucide-react';
import { getBusinessRevisionLabel } from '../shared/businessRevisionLabel';
import { matchesSearch } from '../features/search/searchMatcher';
import { DateSearchFilter } from '../features/search/components/DateSearchFilter';
import { matchesDateRange } from '../features/search/dateRangeFilter';
import type { DateSearchFilterValue } from '../features/search/dateRangeFilter';

export const TemplatesPage: React.FC = () => {
  const {
    getApprovedTemplates,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchTerm,
    setSearchTerm,
    openAddTemplateModal,
    openTemplateDetail,
    openFillReportModal,
    hasPermission,
    templatesLoading,
    templatesError,
    refreshTemplates,
    getApprovedTemplateCategoryCount,
  } = useApp();

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dateFilter, setDateFilter] = useState<DateSearchFilterValue | null>(null);

  const approvedTemplates = getApprovedTemplates();

  const allTags = Array.from(
    new Set(approvedTemplates.flatMap((t) => t.tags))
  );

  const filteredTemplates = approvedTemplates.filter((t) => {
    const matchesCategory = !selectedCategory || t.categoryId === selectedCategory;
    const matchesTag = !selectedTag || t.tags.includes(selectedTag);
    const matchesQuery = matchesDateRange(t.createdAt, dateFilter) && matchesSearch(searchTerm, [t.templateDisplayId, t.name, t.description,
              categories.find((cat) => cat.id === t.categoryId)?.name, t.createdByName, ...t.tags]);

    return matchesCategory && matchesTag && matchesQuery;
  });

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'cat-finance':
        return <DollarSign className="w-5 h-5 text-emerald-600" />;
      case 'cat-hr':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'cat-analytics':
        return <BarChart3 className="w-5 h-5 text-purple-600" />;
      case 'cat-devtools':
        return <Terminal className="w-5 h-5 text-amber-600" />;
      default:
        return <Layers className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            Report Templates
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Use standardized report templates approved for use across the firm.
          </p>
        </div>

        {hasPermission('templates.create') && hasPermission('studio.access') && <button
          onClick={() => openAddTemplateModal()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Report Template</span>
        </button>}
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates by name or Template ID…"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>
          <DateSearchFilter value={dateFilter} onChange={setDateFilter} />

          {/* Category Filter & View Mode */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="">Categories represented ({getApprovedTemplateCategoryCount()})</option>
              {categories.map((cat) => {
                const count = approvedTemplates.filter((t) => t.categoryId === cat.id).length;
                return (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({count})
                  </option>
                );
              })}
            </select>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tags Filter Chips */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] shrink-0 mr-1">Filter Tag:</span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                selectedTag === null ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Tags
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                  selectedTag === tag ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      {templatesLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">Loading report templates...</div>
      ) : templatesError ? (
        <div className="bg-white rounded-xl border border-rose-200 p-12 text-center text-rose-700 space-y-3"><h3 className="text-sm font-semibold">Unable to load report templates.</h3><button onClick={() => void refreshTemplates()} className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg cursor-pointer">Retry</button></div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3 shadow-xs">
          <Filter className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No report templates found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {approvedTemplates.length === 0 ? 'No approved report templates are available yet.' : 'No report templates match the current filters.'}
          </p>
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSelectedTag(null);
              setSearchTerm('');
            }}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : selectedCategory !== null || selectedTag !== null || searchTerm.trim() !== '' ? (
        <div>
          <div className="mb-3 text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Showing {filteredTemplates.length} approved report templates</span>
            {(selectedCategory || selectedTag || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedTag(null);
                  setSearchTerm('');
                }}
                className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
              >
                Reset Filter
              </button>
            )}
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((tpl) => (
                <TemplateCard key={tpl.id} template={tpl} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {filteredTemplates.map((tpl) => (
                <div key={tpl.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-lg bg-slate-100 mt-0.5">
                      {getCategoryIcon(tpl.categoryId)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{tpl.name}</h4>{tpl.templateDisplayId && <span className="text-[10px] font-mono text-slate-400">{tpl.templateDisplayId}</span>}
                        <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.2 rounded border border-slate-200">
                          {getBusinessRevisionLabel(tpl.version)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{tpl.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                        <span>By {tpl.createdByName}</span>
                        <span>•</span>
                        <span>Updated {new Date(tpl.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasPermission('templates.use') && hasPermission('reports.create') && <button
                      onClick={() => openTemplateDetail(tpl)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                      title="Preview Template"
                    >
                      <Eye className="w-4 h-4" />
                    </button>}
                    <button
                      onClick={() => openFillReportModal(tpl)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Use Template</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : categories.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((tpl) => <TemplateCard key={tpl.id} template={tpl} />)}
        </div>
      ) : (
        /* Default Grouped View by Category Heading */
        <div className="space-y-8">
          {categories.map((cat) => {
            const catTemplates = approvedTemplates.filter((t) => t.categoryId === cat.id);
            if (catTemplates.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                      {getCategoryIcon(cat.id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">{cat.name}</h2>
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {catTemplates.length} {catTemplates.length === 1 ? 'template' : 'templates'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedCategory(cat.id)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    View category →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catTemplates.map((tpl) => (
                    <TemplateCard key={tpl.id} template={tpl} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
