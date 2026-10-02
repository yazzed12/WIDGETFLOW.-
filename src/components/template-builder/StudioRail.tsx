import React from 'react';
import {
  LayoutTemplate,
  Shapes,
  Package,
  BookOpen,
  Type,
  Layers,
  Database,
  Palette,
  GitMerge,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { useSystemConfig } from '../../context/SystemConfigContext';
import { useApp } from '../../context/AppContext';

export type StudioTab = 'templates' | 'elements' | 'content-library' | 'packs' | 'text' | 'sections' | 'data-fields' | 'tools' | 'workflow';

// Workflow code remains available for its future canonical implementation, but
// it is intentionally not exposed in the normal Studio surface today.
export const HIDDEN_NORMAL_STUDIO_TABS = new Set<StudioTab>(['workflow']);

interface StudioRailProps {
  mode?: 'template' | 'admin-pack';
  activeTab: StudioTab | null;
  onSelectTab: (tab: StudioTab) => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  hasWorkflowErrors?: boolean;
  allowedTabs?: ReadonlySet<StudioTab>;
}

export const STUDIO_RAIL_ITEMS: Array<{ id: StudioTab; label: string; icon: React.ReactNode; featureKey: string }> = [
  { id: 'templates', label: 'Templates', icon: <LayoutTemplate className="w-5 h-5" />, featureKey: 'studio.templates' },
  { id: 'elements', label: 'Elements', icon: <Shapes className="w-5 h-5" />, featureKey: 'studio.elements' },
  { id: 'content-library', label: 'Content Library', icon: <BookOpen className="w-5 h-5 text-indigo-400" />, featureKey: 'studio.content_library' },
  { id: 'packs', label: 'Packs', icon: <Package className="w-5 h-5 text-indigo-400" />, featureKey: 'studio.packs' },
  { id: 'text', label: 'Text', icon: <Type className="w-5 h-5" />, featureKey: 'studio.text' },
  { id: 'sections', label: 'Sections', icon: <Layers className="w-5 h-5" />, featureKey: 'studio.sections' },
  { id: 'data-fields', label: 'Data Fields', icon: <Database className="w-5 h-5" />, featureKey: 'studio.data_fields' },
  { id: 'tools', label: 'Themes', icon: <Palette className="w-5 h-5" />, featureKey: 'studio.themes' },
  { id: 'workflow', label: 'Workflow', icon: <GitMerge className="w-5 h-5 text-indigo-400" />, featureKey: 'studio.workflow' },
];

export const StudioRail: React.FC<StudioRailProps> = ({
  mode = 'template',
  activeTab,
  onSelectTab,
  isDrawerOpen,
  onToggleDrawer,
  hasWorkflowErrors,
  allowedTabs,
}) => {
  const { isFeatureEnabled } = useSystemConfig();
  const { currentUser } = useApp();
  const isAdminUser = currentUser?.role === 'Admin';
  const adminPackTabs = new Set<StudioTab>(['elements', 'content-library', 'text', 'sections', 'data-fields']);
  const visibleItems = STUDIO_RAIL_ITEMS.filter((item) =>
    (mode === 'admin-pack' || !HIDDEN_NORMAL_STUDIO_TABS.has(item.id)) &&
    (mode === 'admin-pack' || isAdminUser || isFeatureEnabled(item.featureKey)) &&
    (mode !== 'admin-pack' || adminPackTabs.has(item.id)) &&
    (mode === 'admin-pack' || !allowedTabs || allowedTabs.has(item.id))
  );

  return (
    <div className="w-16 sm:w-20 bg-slate-950 text-slate-400 border-r border-slate-800/80 flex flex-col items-center py-4 space-y-4 shrink-0 select-none z-20">
      {/* Rail Nav Items */}
      <div className="flex-1 space-y-2 w-full px-2">
        {visibleItems.map((item) => {
          const isActive = activeTab === item.id && isDrawerOpen;
          const hasError = item.id === 'workflow' && hasWorkflowErrors;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full py-3 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              {hasError && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-slate-950 animate-pulse" title="Configuration issue requires attention" />
              )}
              <div className={`transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Collapse / Expand Drawer Toggle */}
      <button
        type="button"
        onClick={onToggleDrawer}
        title={isDrawerOpen ? 'Collapse Tool Drawer' : 'Expand Tool Drawer'}
        className="p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
      >
        {isDrawerOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
};
