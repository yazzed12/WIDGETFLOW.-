import React from 'react';
import type { WidgetTemplate } from '../../types';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { getBusinessRevisionLabel } from '../../shared/businessRevisionLabel';
import { DollarSign, Users, BarChart3, Terminal, Layers, Eye, FileSpreadsheet } from 'lucide-react';
import { canCreateTemplateBackedReport } from '../../features/delegations/effectiveAuthority';
import { selectTemplateFromLibrary } from '../../features/templates/templateSelection';

interface TemplateCardProps {
  template: WidgetTemplate;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template }) => {
  const { categories, openTemplateDetail, openFillReportModal, hasOperationalPermission } = useApp();

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'cat-finance':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'cat-hr':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'cat-analytics':
        return <BarChart3 className="w-4 h-4 text-purple-600" />;
      case 'cat-devtools':
        return <Terminal className="w-4 h-4 text-amber-600" />;
      default:
        return <Layers className="w-4 h-4 text-indigo-600" />;
    }
  };

  const categoryName = categories.find((c) => c.id === template.categoryId)?.name || 'General';
  const fieldCount = template.fields ? template.fields.length : 4;
  const canUseTemplate = canCreateTemplateBackedReport(hasOperationalPermission);
  const handleTemplateSelect = () => selectTemplateFromLibrary(
    template,
    canUseTemplate,
    openFillReportModal,
    openTemplateDetail,
  );

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group">
      <button
        type="button"
        onClick={handleTemplateSelect}
        disabled={!hasOperationalPermission('templates.view_approved')}
        aria-label={canUseTemplate && !template.isPaused ? `Use ${template.name} to create a report` : `Preview ${template.name}`}
        className="w-full border-0 bg-transparent p-0 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 cursor-pointer disabled:cursor-default"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="p-2.5 rounded-lg bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            {getCategoryIcon(template.categoryId)}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
              {getBusinessRevisionLabel(template.version) || 'Original'}
            </span>
            <StatusBadge status={template.status} />
            {template.isPaused && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Paused</span>}
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mt-3">
          {template.name}
          {template.templateDisplayId && <span className="block text-[10px] font-mono text-slate-400">{template.templateDisplayId}</span>}
        </h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
          {template.description}
        </p>

        {/* Tag chips & Field count */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4">
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-semibold border border-indigo-100">
            {fieldCount} fields
          </span>
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      </button>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500 min-w-0">
          <span className="font-semibold text-slate-700 block truncate">{categoryName}</span>
          <div className="text-[10px] text-slate-400 truncate">By {template.createdByName} • {formatRelativeTime(template.updatedAt)}</div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasOperationalPermission('templates.view_approved') && <button
            onClick={() => openTemplateDetail(template)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Preview Template Structure"
          >
            <Eye className="w-4 h-4" />
          </button>}
          {canCreateTemplateBackedReport(hasOperationalPermission) && <button
            type="button"
            onClick={() => openFillReportModal(template)}
            disabled={template.isPaused}
            title={template.isPaused ? 'This Template is paused for new Reports.' : undefined}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{template.isPaused ? 'Paused' : 'Use Template'}</span>
          </button>}
        </div>
      </div>
    </div>
  );
};
