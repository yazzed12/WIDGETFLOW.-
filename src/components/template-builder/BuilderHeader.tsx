import React from 'react';
import type { Category } from '../../types';
import type { GovernanceLevel } from '../../shared/permissionCatalog';
import { ArrowLeft, Save, Send, Eye, RotateCcw, RotateCw, CheckCircle2, Clock, Lock, ShieldAlert, Play, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface BuilderHeaderProps {
  mode?: 'template' | 'admin-pack';
  templateName: string;
  onNameChange: (name: string) => void;
  categoryId: string;
  onCategoryChange: (catId: string) => void;
  categories: Category[];
  status: string;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBack: () => void;
  onPreview: () => void;
  onReadiness: () => void;
  onTestRun: () => void;
  onSaveDraft: () => void;
  onSavePack?: () => void;
  onPublishPack?: () => void;
  isEditingPack?: boolean;
  onSubmitForApproval: () => void;
  onCreateVersion?: () => void;
  isSaving: boolean;
  governanceLevel: GovernanceLevel;
  canSubmit: boolean;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onFocusCanvas: () => void;
}

import { fetchTemplateSubmissionAction } from '../../utils/governanceUtils';

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({
  mode = 'template',
  templateName,
  onNameChange,
  categoryId,
  onCategoryChange,
  categories,
  status,
  isDirty,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBack,
  onPreview,
  onReadiness,
  onTestRun,
  onSaveDraft,
  onSavePack,
  onPublishPack,
  isEditingPack = false,
  onSubmitForApproval,
  onCreateVersion,
  isSaving,
  governanceLevel,
  canSubmit,
  leftPanelCollapsed,
  rightPanelCollapsed,
  onToggleLeftPanel,
  onToggleRightPanel,
  onFocusCanvas,
}) => {
  const isApproved = status === 'Approved';
  const isPending = status === 'Pending Approval';
  const isAdminPackMode = mode === 'admin-pack';

  const [submissionAction, setSubmissionAction] = React.useState<{ label: string; helpText: string; isDirect: boolean }>({
    label: 'Submit for Approval',
    helpText: '',
    isDirect: false,
  });

  React.useEffect(() => {
    let mounted = true;
    void fetchTemplateSubmissionAction(governanceLevel).then((res) => {
      if (mounted) {
        setSubmissionAction({ label: res.buttonLabel, helpText: res.helpText, isDirect: res.isDirectPublish });
      }
    });
    return () => {
      mounted = false;
    };
  }, [governanceLevel]);

  return (
    <header className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
      {/* Left Area: Back, Name & Category */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{isAdminPackMode ? 'Back to Pack Management' : 'Back'}</span>
        </button>

        <div className="h-6 w-px bg-slate-800 shrink-0" />

        {/* Template Name & Category */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="text"
            value={templateName}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={isApproved}
            placeholder={isAdminPackMode ? 'Pack Name' : 'Untitled Report Template...'}
            className="bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-64 transition-all"
          />

          {(
            <select
              value={categoryId}
              onChange={(e) => onCategoryChange(e.target.value)}
              disabled={isApproved}
              className="bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              {categories
                .filter((c) => (c as any).status !== 'Inactive' || c.id === categoryId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          )}

          {/* Status Badge */}
          {!isAdminPackMode && <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit shrink-0">
            {isApproved ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" /> Approved (Immutable)
              </span>
            ) : isPending ? (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" /> Pending Approval
              </span>
            ) : (
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Draft {isDirty && '• Unsaved'}
              </span>
            )}
          </div>}
          {isAdminPackMode && (
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Standard Pack Builder
            </span>
          )}
        </div>
      </div>

      {/* Right Area: Undo/Redo, Preview, Save, Submit */}
      <div className="flex flex-wrap items-center justify-end gap-2 self-end md:self-auto max-w-full">
        <div className="flex items-center gap-0.5 bg-slate-800 p-1 rounded-lg border border-slate-700/80" aria-label="Workspace panels">
          <button type="button" onClick={onToggleLeftPanel} aria-label={leftPanelCollapsed ? 'Show resource panel' : 'Hide resource panel'} aria-expanded={!leftPanelCollapsed} title={leftPanelCollapsed ? 'Show resource panel' : 'Hide resource panel'} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer">
            {leftPanelCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
          <button type="button" onClick={onFocusCanvas} aria-label="Focus canvas" title="Focus Canvas" className="px-2 py-1.5 text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors flex items-center gap-1 cursor-pointer">
            <Maximize2 className="w-3.5 h-3.5" /><span className="hidden xl:inline">Focus</span>
          </button>
          <button type="button" onClick={onToggleRightPanel} aria-label={rightPanelCollapsed ? 'Show properties panel' : 'Hide properties panel'} aria-expanded={!rightPanelCollapsed} title={rightPanelCollapsed ? 'Show properties panel' : 'Hide properties panel'} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer">
            {rightPanelCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700/80 mr-1">
          <button
            onClick={onUndo}
            disabled={!canUndo || isApproved}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo || isApproved}
            title="Redo (Ctrl+Y)"
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Preview Button */}
        <button
          onClick={onPreview}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span>Preview</span>
        </button>

        {!isAdminPackMode && (
          <button
            type="button"
            onClick={onTestRun}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Simulate filling this template"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Run</span>
          </button>
        )}

        {!isAdminPackMode && (
          <button
            type="button"
            onClick={onReadiness}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Check template readiness"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            <span>Readiness</span>
          </button>
        )}

        {/* Save Draft */}
        {!isAdminPackMode && !isApproved && (
          <button
            onClick={onSaveDraft}
            disabled={isSaving}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>
        )}

        {/* Create New Version for Approved templates */}
        {!isAdminPackMode && isApproved && onCreateVersion && (
          <button
            onClick={onCreateVersion}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Create New Version</span>
          </button>
        )}

        {/* Submit for Approval / Direct Publish */}
        {!isAdminPackMode && !isApproved && canSubmit && (
          <button
            onClick={onSubmitForApproval}
            disabled={isSaving || isPending}
            title={submissionAction.helpText}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submissionAction.label}</span>
          </button>
        )}

        {isAdminPackMode && onSavePack && (
          <button
            onClick={onSavePack}
            disabled={isSaving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : isEditingPack ? 'Save Changes' : 'Save Pack'}</span>
          </button>
        )}
        {isAdminPackMode && onPublishPack && isEditingPack && (
          <button
            onClick={onPublishPack}
            disabled={isSaving}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Publishing...' : 'Publish'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
