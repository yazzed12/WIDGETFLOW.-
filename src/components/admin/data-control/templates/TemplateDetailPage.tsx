import React, { useState } from 'react';
import {
  ArrowLeft,
  FileCode2,
  Calendar,
  FileSpreadsheet,
  ChevronRight,
  User,
  FolderTree,
} from 'lucide-react';
import type { WidgetTemplate, Category, ReportInstance } from '../../../../types';
import { StatusPill } from '../common/StatusPill';
import { formatDate, resolveCategoryName, resolveUserName } from '../common/entityResolvers';
import { AdvancedRecordDetails } from '../common/AdvancedRecordDetails';
import { DynamicTemplateRenderer } from '../../../dynamic-template/DynamicTemplateRenderer';
import { normalizeReportTemplateSnapshot } from '../../../../shared/signatureResolver';
import { useApp } from '../../../../context/AppContext';

type TemplateTab = 'overview' | 'template' | 'versions' | 'usage' | 'activity';

interface TemplateDetailPageProps {
  template: WidgetTemplate;
  categories?: Category[];
  onBack: () => void;
  onNavigateToReport: (reportId: string) => void;
  onNavigateToUser?: (userId: string) => void;
}

export const TemplateDetailPage: React.FC<TemplateDetailPageProps> = ({
  template,
  categories = [],
  onBack,
  onNavigateToReport,
  onNavigateToUser,
}) => {
  const { reports: allReports, users = [] } = useApp();
  const [activeTab, setActiveTab] = useState<TemplateTab>('template');

  const normalizedTemplate = normalizeReportTemplateSnapshot(template);

  // Derived usage reports
  const usageReports = allReports.filter((r: ReportInstance) => r.templateId === template.id);

  const categoryName = resolveCategoryName(
    template.categoryId,
    (template as any).categoryName,
    categories
  );
  const creatorName = resolveUserName(template.createdById, template.createdByName, users);
  const version = template.version ?? '1';

  // Sections & components from template
  const componentsList: any[] = [];
  if (Array.isArray(normalizedTemplate.components)) {
    componentsList.push(...normalizedTemplate.components);
  } else if (Array.isArray(normalizedTemplate.fields)) {
    componentsList.push(...normalizedTemplate.fields);
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Templates</span>
        </button>
      </div>

      {/* Header card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-xs">
              <FileCode2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {template.name || 'Untitled Template'}
                </h1>
                <StatusPill status={template.status} />
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  v{version}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                <span className="flex items-center gap-1">
                  <FolderTree className="w-3.5 h-3.5 text-slate-400" />
                  {categoryName}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Created by{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (template.createdById && onNavigateToUser) {
                        onNavigateToUser(template.createdById);
                      }
                    }}
                    className="text-slate-800 font-bold hover:text-purple-700 hover:underline cursor-pointer"
                  >
                    {creatorName}
                  </button>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Updated {formatDate(template.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'template', label: 'Template Blueprint & Preview' },
            { id: 'overview', label: 'Overview' },
            { id: 'versions', label: 'Versions' },
            { id: 'usage', label: `Usage (${usageReports.length})` },
            { id: 'activity', label: 'Lifecycle & Approvals' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TemplateTab)}
                className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB: TEMPLATE PREVIEW & BLUEPRINT */}
      {activeTab === 'template' && (
        <div className="space-y-6">
          {/* Visual Renderer Container */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Live Form Preview (Read-Only Inspection)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Actual visual layout and interactive controls configured for this template.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                Read-Only
              </span>
            </div>

            <div className="py-4 border border-slate-100 rounded-2xl bg-slate-50/50 p-4 md:p-6">
              <DynamicTemplateRenderer
                template={normalizedTemplate}
                values={{}}
                mode="readOnly"
              />
            </div>
          </div>

          {/* Structured Component & Field Blueprint */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Component &amp; Section Hierarchy
            </h3>
            {componentsList.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No components defined.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-3">Component / Label</th>
                      <th className="py-2.5 px-3">Field Type</th>
                      <th className="py-2.5 px-3">Section</th>
                      <th className="py-2.5 px-3">Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {componentsList.map((comp, idx) => (
                      <tr key={comp.id || idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {comp.label || comp.title || comp.name || 'Untitled Field'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {comp.type || 'text'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {comp.section || 'General Information'}
                        </td>
                        <td className="py-2.5 px-3">
                          {comp.required ? (
                            <span className="text-amber-700 font-bold text-[10px]">Yes</span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Optional</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Template Specifications
              </h3>
              <dl className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Category</dt>
                  <dd className="font-bold text-slate-900">{categoryName}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Status</dt>
                  <dd className="font-bold text-slate-900">{template.status}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Current Version</dt>
                  <dd className="font-mono text-slate-700 font-bold">v{version}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Author</dt>
                  <dd className="font-bold text-slate-900">{creatorName}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Reports Generated</dt>
                  <dd className="font-bold text-slate-900">{usageReports.length}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Creation Method</dt>
                  <dd className="text-slate-700 font-medium">
                    {template.creationMethod || 'Standard'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Description &amp; Tags
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {template.description || 'No description provided for this template.'}
              </p>
              {template.tags && template.tags.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-400 block mb-2">Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {template.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <AdvancedRecordDetails recordId={template.id} data={template as unknown as Record<string, unknown>} />
        </div>
      )}

      {/* TAB: VERSIONS */}
      {activeTab === 'versions' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Snapshot Version History
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Version {version} (Active)</span>
                <span className="text-[11px] text-slate-400">
                  Authored by {creatorName} · {formatDate(template.updatedAt)}
                </span>
              </div>
              <StatusPill status="approved" size="sm" />
            </div>
          </div>
        </div>
      )}

      {/* TAB: USAGE */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            {usageReports.length === 0 ? (
              <div className="p-12 text-center">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No reports generated yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No submitted or active reports have been created from this template.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 font-bold">Report Title</th>
                    <th className="py-3.5 px-4 font-bold">Author</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold">Created</th>
                    <th className="py-3.5 px-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usageReports.map((r: ReportInstance) => (
                    <tr
                      key={r.id}
                      onClick={() => onNavigateToReport(r.id)}
                      className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-purple-700">
                        {r.title || 'Untitled Report'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {r.createdByName || 'User'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={r.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {formatDate(r.createdAt)}
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
            )}
          </div>
        </div>
      )}

      {/* TAB: ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Approval &amp; Revision Log
          </h3>
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
            <div className="relative">
              <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white" />
              <p className="font-bold text-slate-900">Template Status: {template.status}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Current active revision v{version} published in catalog.
              </p>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                {formatDate(template.updatedAt, true)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
