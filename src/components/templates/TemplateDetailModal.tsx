import React from 'react';
import type { WidgetTemplate } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, FileText, Sparkles, DollarSign, Users, BarChart3, Terminal, Layers, Calendar, User as UserIcon, Check } from 'lucide-react';

interface TemplateDetailModalProps {
  template: WidgetTemplate;
  onClose: () => void;
}

export const TemplateDetailModal: React.FC<TemplateDetailModalProps> = ({ template, onClose }) => {
  const { categories, openFillReportModal } = useApp();

  const category = categories.find((c) => c.id === template.categoryId);

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

  const handleUseTemplate = () => {
    onClose();
    openFillReportModal(template);
  };

  const fields = template.fields && template.fields.length > 0
    ? template.fields
    : [
        { id: 'f-def-1', label: 'Reporting Period', type: 'date', required: true, section: 'General Information' },
        { id: 'f-def-2', label: 'Department / Unit', type: 'select', required: true, section: 'General Information' },
        { id: 'f-def-3', label: 'Primary Metrics & Values', type: 'currency', required: true, section: 'Financial Metrics' },
        { id: 'f-def-4', label: 'Variance & Analysis Notes', type: 'textarea', required: false, section: 'Analysis' },
      ];

  const sections = Array.from(new Set(fields.map((f) => f.section || 'General Information')));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-scale-up">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs text-indigo-600 mt-0.5">
              {getCategoryIcon(template.categoryId)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">{template.name}</h2>{template.templateDisplayId && <span className="text-[10px] font-mono text-slate-400">{template.templateDisplayId}</span>}
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded">
                  {template.version || 'v1.0'}
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  Approved Template
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{template.description}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Category</span>
              <span className="font-bold text-slate-800">{category?.name || 'General'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Created By</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-slate-400" />
                {template.createdByName}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Role</span>
              <span className="font-medium text-indigo-600">{template.createdByRole}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Last Updated</span>
              <span className="font-medium text-slate-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {new Date(template.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Report Structure Preview */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Standardized Report Structure & Defined Fields
            </h3>

            <div className="space-y-3">
              {sections.map((sectionName) => {
                const sectionFields = fields.filter((f) => (f.section || 'General Information') === sectionName);
                return (
                  <div key={sectionName} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 text-[11px]">
                      {sectionName}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {sectionFields.map((field) => (
                        <div key={field.id} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800">{field.label}</span>
                            {field.required && <span className="text-rose-500 font-bold ml-1">*</span>}
                          </div>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                            {field.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Usage Instructions Banner */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-start gap-2">
            <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span>This is an official firm-wide approved report template. Clicking <strong>Use Template</strong> allows you to create a new report with your own data without modifying the template.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handleUseTemplate}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Use Template</span>
          </button>
        </div>
      </div>
    </div>
  );
};
