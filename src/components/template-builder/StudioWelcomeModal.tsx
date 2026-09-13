import React, { useState } from 'react';
import {
  FileCode,
  LayoutTemplate,
  UploadCloud,
  X,
  ArrowRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { WidgetTemplate, Category, ImportProposal } from '../../types';
import { analyzeTemplateImportInBrowser } from '../../services/templateImportBrowser';

interface StudioWelcomeModalProps {
  templates: WidgetTemplate[];
  categories: Category[];
  onStartBlank: () => void;
  onSelectExistingTemplate: (template: WidgetTemplate) => void;
  onImportProposalReady: (proposal: ImportProposal) => void;
  onClose: () => void;
}

export const StudioWelcomeModal: React.FC<StudioWelcomeModalProps> = ({
  templates,
  onStartBlank,
  onSelectExistingTemplate,
  onImportProposalReady,
  onClose,
}) => {
  const [activeMode, setActiveMode] = useState<'hub' | 'import' | 'template_picker'>('hub');

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Handle File Upload Submit
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setIsUploading(true);
    setImportError(null);

    try {
      const data = await analyzeTemplateImportInBrowser(importFile);
      onImportProposalReady(data);
    } catch (err: any) {
      setImportError(err.message || 'Import failed. Please try a different DOCX, XLSX, or JSON file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">WidgetFlow Studio</h2>
            <p className="text-xs text-slate-500 font-medium">Smart Template Intake Hub</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeMode === 'hub' && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900">What would you like to create?</h3>
                <p className="text-xs text-slate-500">Choose an intake path to build your dynamic business template</p>
              </div>

              {/* 3 Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Start Blank */}
                <button
                  type="button"
                  onClick={onStartBlank}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 flex items-center justify-center mb-3 transition-colors">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-900">Start Blank</div>
                    <div className="text-xs text-slate-500 mt-1">Build a clean workspace from scratch using the universal toolbox.</div>
                  </div>
                </button>

                {/* 2. Use Existing Template */}
                <button
                  type="button"
                  onClick={() => setActiveMode('template_picker')}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 flex items-center justify-center mb-3 transition-colors">
                      <LayoutTemplate className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-900">Use a Template</div>
                    <div className="text-xs text-slate-500 mt-1">Start from an existing firm-wide approved business template.</div>
                  </div>
                </button>

                {/* 3. Import File */}
                <button
                  type="button"
                  onClick={() => setActiveMode('import')}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-700 flex items-center justify-center mb-3 transition-colors">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-emerald-900">Import Existing File</div>
                    <div className="text-xs text-slate-500 mt-1">Convert Word (DOCX), Excel (XLSX), or JSON files into dynamic templates.</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Import File Mode */}
          {activeMode === 'import' && (
            <form onSubmit={handleFileUpload} className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-600" /> Import Existing Document
                </h3>
                <button type="button" onClick={() => setActiveMode('hub')} className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">
                  ← Back to Hub
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-50 hover:bg-emerald-50/30 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  accept=".docx,.xlsx,.xls,.json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer space-y-2 block">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-xs text-slate-900">
                    {importFile ? importFile.name : 'Click to select or drag and drop document'}
                  </div>
                  <div className="text-[11px] text-slate-500">Supports Word (.docx), Excel (.xlsx), and WidgetFlow (.json)</div>
                </label>
              </div>

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveMode('hub')} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importFile || isUploading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Analyze & Review Import
                </button>
              </div>
            </form>
          )}

          {/* Template Picker Mode */}
          {activeMode === 'template_picker' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Select Existing Template to Clone</h3>
                <button type="button" onClick={() => setActiveMode('hub')} className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">
                  ← Back to Hub
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onSelectExistingTemplate(tpl)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 bg-white text-left transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                  >
                    <div className="font-bold text-xs text-slate-900">{tpl.name}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-2 mt-1">{tpl.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
