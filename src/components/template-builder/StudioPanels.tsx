import React, { useEffect, useMemo, useState } from 'react';
import type { WidgetTemplate, Category, TemplateTheme, ContentPack, AdminPack, ContentLibraryItem, BuilderValidationIssue } from '../../types';
import type { StudioTab } from './StudioRail';
import { TOOLBOX_ITEMS } from './BuilderToolbox';
import type { ToolboxItem } from './BuilderToolbox';
import { ContentLibraryPanel } from './ContentLibraryPanel';
import { PacksPanel } from './PacksPanel';
import { StudioThemePanel } from './StudioThemePanel';
import { DATA_FIELDS_LIBRARY } from '../../data/dataFieldsLibrary';
import { DEFAULT_THEME_TOKENS } from '../../shared/themeResolver';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Plus,
  Upload,
  Star,
  ChevronRight,
  GripVertical,
  HelpCircle,
  Package,
} from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

interface StudioPanelsProps {
  builderMode?: 'template' | 'admin-pack';
  activeTab: StudioTab;
  templates: WidgetTemplate[];
  categories: Category[];
  selectedCategoryFilter: string | null;
  onSelectCategoryFilter: (catId: string | null) => void;
  onStartBlank: () => void;
  onStartFromTemplate: (template: WidgetTemplate) => void;
  onOpenImportModal: () => void;
  onAddComponent: (item: ToolboxItem) => void;
  onAddTextPreset: (preset: { type: 'heading' | 'paragraph'; label: string; headingLevel?: 'h1' | 'h2' | 'h3'; paragraphStyle?: 'body' | 'instruction' | 'caption' }) => void;
  onAddDataFieldPreset: (preset: { type: any; label: string; key: string; placeholder?: string; options?: string[]; required?: boolean }) => void;
  onAddPrebuiltBlock?: (blockType: 'employee' | 'request' | 'budget' | 'approval') => void;
  onAddToPack?: (item: ToolboxItem) => void;
  contentPacks?: ContentPack[];
  onInsertPack?: (pack: ContentPack) => void;
  onPreviewPack?: (pack: ContentPack) => void;
  onEditPack?: (pack: ContentPack) => void;
  onDeletePack?: (packId: string) => Promise<void>;
  onInsertAdminPack?: (pack: AdminPack) => void;
  onInsertContentItem?: (item: ContentLibraryItem) => void;
  sections: any[];
  selectedSectionId?: string | null;
  selectedComponentId?: string | null;
  onSelectSection: (sectionId: string) => void;
  onSelectComponent?: (sectionId: string, componentId: string, shouldScroll?: boolean) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onRenameSection?: (sectionId: string, newTitle: string) => void;
  componentIssuesMap?: Map<string, BuilderValidationIssue>;
  onAddSection: () => void;
  onOpenPreview: () => void;
  isApproved: boolean;
  templateTheme?: TemplateTheme;
  onUpdateTheme?: (theme: Partial<TemplateTheme>) => void;
  onOpenHelp?: (type: string) => void;
}

const DraggablePanelItem: React.FC<{
  item: ToolboxItem;
  onAdd: (item: ToolboxItem) => void;
  onAddToPack?: (item: ToolboxItem) => void;
}> = ({ item, onAdd, onAddToPack }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `studio-panel-${item.type}`,
    data: { item, isToolboxItem: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onAdd(item)}
      className={`p-2.5 bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xs rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing transition-all select-none group ${
        isDragging ? 'opacity-40 border-indigo-500 shadow-md ring-2 ring-indigo-500/20' : ''
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
        <div className="p-1.5 bg-slate-50 rounded-lg shrink-0">{item.icon}</div>
        <span className="text-xs font-semibold text-slate-800 truncate">{item.label}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onAddToPack && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToPack(item);
            }}
            title="Add element definition to My Packs"
            className="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            <Package className="w-3 h-3 text-indigo-600" />
            <span className="hidden sm:inline">Add to Pack</span>
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(item);
          }}
          title="Add to canvas"
          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const StudioPanels: React.FC<StudioPanelsProps> = ({
  builderMode = 'template',
  activeTab,
  templates,
  categories,
  selectedCategoryFilter,
  onSelectCategoryFilter,
  onStartBlank,
  onStartFromTemplate,
  onOpenImportModal,
  onAddComponent,
  onAddTextPreset,
  onAddDataFieldPreset,
  onAddToPack,
  contentPacks: _contentPacks,
  onInsertPack: _onInsertPack,
  onPreviewPack: _onPreviewPack,
  onEditPack: _onEditPack,
  onDeletePack: _onDeletePack,
  onInsertAdminPack,
  onInsertContentItem,
  sections,
  selectedSectionId,
  selectedComponentId,
  onSelectSection,
  onSelectComponent,
  onDuplicateSection,
  onDeleteSection,
  onRenameSection: _onRenameSection,
  componentIssuesMap,
  onAddSection,
  onOpenPreview: _onOpenPreview,
  isApproved,
  templateTheme,
  onUpdateTheme,
  onOpenHelp,
}) => {
  const { isElementEnabled } = useSystemConfig();
  const { currentUser } = useApp();
  const isAdminUser = currentUser?.role === 'Admin';
  const [templateSearch, setTemplateSearch] = useState('');
  const [favoriteTemplates, setFavoriteTemplates] = useState<Record<string, boolean>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
  const [dataFieldSearch, setDataFieldSearch] = useState('');
  const [selectedDataFieldCategory, setSelectedDataFieldCategory] = useState<string>('All');
  const [outlineSearch, setOutlineSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(sections.map((section) => section.id)));

  useEffect(() => {
    setExpandedSections((current) => {
      const validIds = new Set(sections.map((section) => section.id));
      const next = new Set([...current].filter((id) => validIds.has(id)));
      sections.forEach((section) => {
        if (!current.size) next.add(section.id);
      });
      if (selectedSectionId) next.add(selectedSectionId);
      return next;
    });
  }, [sections, selectedSectionId]);

  const filteredOutlineSections = useMemo(() => {
    const query = outlineSearch.trim().toLowerCase();
    if (!query) return sections;
    return sections.filter((section) =>
      section.title.toLowerCase().includes(query) ||
      section.components?.some((component: any) =>
        String(component.label || '').toLowerCase().includes(query) ||
        String(component.type || '').toLowerCase().includes(query),
      ),
    );
  }, [outlineSearch, sections]);

  const categoriesList = ['All', 'General', 'People / HR', 'Finance', 'Operations', 'Technology', 'Project Management', 'Compliance / Risk'];

  const filteredDataFields = DATA_FIELDS_LIBRARY.filter((df) => {
    if (selectedDataFieldCategory !== 'All' && df.category !== selectedDataFieldCategory) return false;
    if (dataFieldSearch.trim()) {
      const q = dataFieldSearch.toLowerCase();
      return (
        df.name.toLowerCase().includes(q) ||
        df.purpose.toLowerCase().includes(q) ||
        df.key.toLowerCase().includes(q) ||
        df.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteTemplates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter templates list
  const approvedTemplates = templates.filter((t) => t.status === 'Approved');
  const filteredTemplates = approvedTemplates.filter((t) => {
    if (selectedCategoryFilter && t.categoryId !== selectedCategoryFilter) return false;
    if (filterMode === 'favorites' && !favoriteTemplates[t.id]) return false;
    if (templateSearch.trim()) {
      const q = templateSearch.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="w-full min-w-0 bg-slate-50 border-r border-slate-200/90 flex flex-col h-full overflow-y-auto select-none">
      {/* Tab 1: TEMPLATES PANEL */}
      {activeTab === 'templates' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Templates Studio</h2>
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              {approvedTemplates.length} Available
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onStartBlank}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Blank Template</span>
            </button>

            <button
              type="button"
              onClick={onOpenImportModal}
              className="p-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Import File</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-[11px] font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`flex-1 py-1 text-center rounded-lg transition-all cursor-pointer ${
                  filterMode === 'all' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : ''
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('favorites')}
                className={`flex-1 py-1 text-center rounded-lg transition-all cursor-pointer ${
                  filterMode === 'favorites' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : ''
                }`}
              >
                Favorites
              </button>
            </div>

            <select
              value={selectedCategoryFilter || ''}
              onChange={(e) => onSelectCategoryFilter(e.target.value === '' ? null : e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none cursor-pointer font-medium"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 pt-1 max-h-[50vh] overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs italic bg-white rounded-xl border border-slate-200">
                No templates found matching filters.
              </div>
            ) : (
              filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onStartFromTemplate(t)}
                  className="p-3 bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all shadow-2xs cursor-pointer group space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {t.name}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(t.id, e)}
                      className="text-slate-300 hover:text-amber-500 transition-colors p-0.5"
                    >
                      <Star className={`w-3.5 h-3.5 ${favoriteTemplates[t.id] ? 'text-amber-500 fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">{t.description}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-600">
                      {categories.find((c) => c.id === t.categoryId)?.name || 'General'}
                    </span>
                    <span className="font-semibold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                      Use Template <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* Tab: CONTENT LIBRARY PANEL */}
      {activeTab === 'content-library' && (
        <ContentLibraryPanel
          onInsertContentItem={onInsertContentItem}
          onOpenHelp={onOpenHelp}
        />
      )}

      {/* Tab: PACKS PANEL */}
      {activeTab === 'packs' && (
        <PacksPanel onInsertAdminPack={onInsertAdminPack || (() => {})} onOpenHelp={onOpenHelp} />
      )}

      {/* Tab: ELEMENTS PANEL */}
      {activeTab === 'elements' && (
        <div className="p-4 space-y-5">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Universal Elements</h2>
            <p className="text-[11px] text-slate-500 leading-normal">
              Universal building blocks available for all report templates.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Inputs</h3>
            <div className="space-y-1.5">
              {TOOLBOX_ITEMS.filter((i) => i.category === 'basic' && (builderMode === 'admin-pack' || isAdminUser || isElementEnabled(`elements.${i.type}`))).map((item) => (
                <DraggablePanelItem key={item.type} item={item} onAdd={onAddComponent} onAddToPack={builderMode === 'admin-pack' ? undefined : onAddToPack} />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Structure & Content</h3>
            <div className="space-y-1.5">
              {TOOLBOX_ITEMS.filter((i) => (i.category === 'content' || i.category === 'structure') && (builderMode === 'admin-pack' || isAdminUser || isElementEnabled(`elements.${i.type}`))).map((item) => (
                <DraggablePanelItem key={item.type} item={item} onAdd={onAddComponent} onAddToPack={builderMode === 'admin-pack' ? undefined : onAddToPack} />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Business Components</h3>
            <div className="space-y-1.5">
              {TOOLBOX_ITEMS.filter((i) => i.category === 'business' && (builderMode === 'admin-pack' || isAdminUser || isElementEnabled(`elements.${i.type}`))).map((item) => (
                <DraggablePanelItem key={item.type} item={item} onAdd={onAddComponent} onAddToPack={builderMode === 'admin-pack' ? undefined : onAddToPack} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: TEXT PANEL */}
      {activeTab === 'text' && (
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Text Presets</h2>
            <p className="text-[11px] text-slate-500 leading-normal">
              Click to insert pre-styled text components into your template workspace.
            </p>
          </div>

          <div className="space-y-2">
            {([
              { type: 'heading', label: 'Document Title', subtitle: 'Main title shown at the top of a report', headingLevel: 'h1' },
              { type: 'heading', label: 'Heading 1', subtitle: 'Primary section heading', headingLevel: 'h1' },
              { type: 'heading', label: 'Heading 2', subtitle: 'Subsection heading', headingLevel: 'h2' },
              { type: 'heading', label: 'Heading 3', subtitle: 'Detailed subsection heading', headingLevel: 'h3' },
              { type: 'paragraph', label: 'Body Text', subtitle: 'Instructions, explanations, or standard wording', paragraphStyle: 'body' },
              { type: 'paragraph', label: 'Instruction', subtitle: 'Helpful guidance for people completing the report', paragraphStyle: 'instruction' },
              { type: 'paragraph', label: 'Caption', subtitle: 'Small supporting text below or beside content', paragraphStyle: 'caption' },
            ] as const).map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onAddTextPreset(p)}
                className="w-full p-3 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-400 rounded-2xl text-left cursor-pointer transition-all space-y-0.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {p.label}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <p className="text-[10px] text-slate-400">{p.subtitle}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab: SECTIONS PANEL (OUTLINE) */}
      {activeTab === 'sections' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Document Outline</h2>
            {!isApproved && (
              <button
                type="button"
                onClick={onAddSection}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Section
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={outlineSearch}
              onChange={(event) => setOutlineSearch(event.target.value)}
              placeholder="Search sections and fields"
              aria-label="Search document outline"
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-2">
            {filteredOutlineSections.map((sec) => {
              const isExpanded = expandedSections.has(sec.id);
              const issueCount = (sec.components || []).filter((component: any) => componentIssuesMap?.has(component.id)).length;
              return (
                <div key={sec.id} className={`bg-white border rounded-xl overflow-hidden transition-colors ${selectedSectionId === sec.id ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-1 p-2">
                    <button
                      type="button"
                      onClick={() => setExpandedSections((current) => {
                        const next = new Set(current);
                        if (next.has(sec.id)) next.delete(sec.id); else next.add(sec.id);
                        return next;
                      })}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${sec.title}`}
                      aria-expanded={isExpanded}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg cursor-pointer"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectSection(sec.id)}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                      aria-current={selectedSectionId === sec.id ? 'true' : undefined}
                    >
                      <span className="block text-xs font-bold text-slate-800 truncate">{sec.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{sec.components?.length || 0} {(sec.components?.length || 0) === 1 ? 'element' : 'elements'}</span>
                    </button>
                    {issueCount > 0 && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">{issueCount} Issues</span>}
                    {!isApproved && onDuplicateSection && (
                      <button type="button" onClick={() => onDuplicateSection(sec.id)} aria-label={`Duplicate ${sec.title}`} title="Duplicate section" className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg cursor-pointer">+</button>
                    )}
                    {!isApproved && onDeleteSection && sections.length > 1 && (
                      <button type="button" onClick={() => onDeleteSection(sec.id)} aria-label={`Delete ${sec.title}`} title="Delete section" className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer">×</button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-3 py-2 space-y-1">
                      {(sec.components || []).map((component: any) => {
                        const toolboxItem = TOOLBOX_ITEMS.find((item) => item.type === component.type);
                        return (
                          <button
                            key={component.id}
                            type="button"
                            onClick={() => onSelectComponent?.(sec.id, component.id, true)}
                            className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left cursor-pointer transition-colors ${selectedComponentId === component.id ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-slate-50 text-slate-700'}`}
                          >
                            <span className="shrink-0 text-slate-400">{toolboxItem?.icon}</span>
                            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{component.label || toolboxItem?.label || component.type}</span>
                            {componentIssuesMap?.has(component.id) && <span className="text-amber-600 text-[10px] font-bold">!</span>}
                          </button>
                        );
                      })}
                      {(sec.components || []).length === 0 && <p className="px-2 py-1 text-[10px] text-slate-400">Empty section</p>}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredOutlineSections.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No matching outline items.</p>}
          </div>
        </div>
      )}

      {/* Tab: DATA FIELDS PANEL (ENRICHED) */}
      {activeTab === 'data-fields' && (
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Data Fields Library</h2>
              {onOpenHelp && (
                <button
                  type="button"
                  onClick={() => onOpenHelp('data-fields')}
                  title="Quick Guide / Help"
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Ready-made single business fields organized by enterprise category.
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ready data fields..."
              value={dataFieldSearch}
              onChange={(e) => setDataFieldSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedDataFieldCategory(cat)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  selectedDataFieldCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Data Field Cards Grid */}
          <div className="space-y-2">
            {filteredDataFields.map((df) => (
              <div
                key={df.id}
                className="p-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all space-y-1.5 shadow-2xs group"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {df.name}
                  </h4>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    {df.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">{df.purpose}</p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                  <span>Type: {df.componentType}</span>
                  <div className="flex items-center gap-1">
                    {onAddToPack && (
                      <button
                        type="button"
                        onClick={() =>
                          onAddToPack({
                            type: df.componentType,
                            label: df.name,
                            defaultLabel: df.defaultLabel,
                            defaultPlaceholder: df.defaultPlaceholder,
                            defaultOptions: df.defaultOptions,
                            category: 'basic',
                            icon: <Package className="w-4 h-4" />,
                          })
                        }
                        title="Add to My Packs"
                        className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Package className="w-3 h-3" /> Pack
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onAddDataFieldPreset({
                          type: df.componentType,
                          label: df.defaultLabel,
                          key: df.key,
                          placeholder: df.defaultPlaceholder,
                          options: df.defaultOptions,
                          required: df.required,
                        })
                      }
                      className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: TOOLS & THEMES PANEL */}
      {activeTab === 'tools' && (
        <StudioThemePanel
          theme={templateTheme}
          onUpdateTheme={onUpdateTheme || (() => {})}
          onResetTheme={onUpdateTheme ? () => onUpdateTheme(DEFAULT_THEME_TOKENS.clean) : undefined}
        />
      )}
    </div>
  );
};
