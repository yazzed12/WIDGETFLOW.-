import React, { useState } from 'react';
import type { TemplateSection, BuilderValidationIssue, TemplateTheme } from '../../types';
import { BuilderComponent } from './BuilderComponent';
import { GripVertical, Layers, Trash2, Edit2, Check, Plus, Package } from 'lucide-react';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { resolveDocumentSpacing, resolveSectionStyle } from '../../shared/themeResolver';

interface BuilderSectionProps {
  section: TemplateSection;
  templateTheme?: TemplateTheme;
  totalSections: number;
  selectedSectionId?: string | null;
  selectedComponentId: string | null;
  componentIssuesMap?: Map<string, BuilderValidationIssue>;
  onSelectComponent: (id: string) => void;
  onSelectSection: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onRenameSection: (sectionId: string, newTitle: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddComponentToSection: (sectionId: string) => void;
  onSaveAsContentPack?: (section: TemplateSection) => void;
  onResizeComponent: (componentId: string, widthPercent: number) => void;
  canResize: boolean;
  isApproved: boolean;
}

export const BuilderSection: React.FC<BuilderSectionProps> = ({
  section,
  templateTheme,
  totalSections,
  selectedSectionId,
  selectedComponentId,
  componentIssuesMap,
  onSelectComponent,
  onSelectSection,
  onDuplicateComponent,
  onDeleteComponent,
  onRenameSection,
  onDeleteSection,
  onAddComponentToSection,
  onSaveAsContentPack,
  onResizeComponent,
  canResize,
  isApproved,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(section.title);

  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: { section, isSection: true },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-sec-${section.id}`,
    data: { sectionId: section.id, isSectionDropZone: true },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSaveTitle = () => {
    const trimmed = titleInput.trim();
    if (trimmed) {
      onRenameSection(section.id, trimmed);
    } else {
      setTitleInput(section.title);
    }
    setIsEditingTitle(false);
  };

  const componentIds = section.components.map((c) => c.id);
  const spacing = resolveDocumentSpacing(templateTheme);
  const sectionStyle = resolveSectionStyle(templateTheme);

  return (
    <div
      ref={setSortableRef}
      style={{ ...style, backgroundColor: sectionStyle.backgroundColor, borderColor: sectionStyle.borderColor }}
      className={`rounded-2xl border transition-all ${
        isDragging ? 'opacity-30' : 'bg-white border-slate-200 shadow-xs'
      } ${isOver ? 'ring-2 ring-indigo-500/40 bg-indigo-50/20' : ''} ${selectedSectionId === section.id ? 'ring-2 ring-indigo-500/20 border-indigo-300' : ''}`}
    >
      {/* Section Header */}
      <div onClick={() => onSelectSection(section.id)} className="p-4 border-b rounded-t-2xl flex items-center justify-between gap-3 cursor-pointer" style={{ backgroundColor: sectionStyle.backgroundColor, borderColor: sectionStyle.borderColor }}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing rounded shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <Layers className="w-4 h-4" />
          </div>

          {/* Section Title Editor */}
          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTitleInput(section.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="w-full px-3 py-1 bg-white border border-indigo-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group flex-1 min-w-0">
              <h3
                onClick={() => !isApproved && setIsEditingTitle(true)}
                className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate cursor-pointer hover:text-indigo-600 transition-colors"
              >
                {section.title}
              </h3>
              {!isApproved && (
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 rounded transition-all"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section Actions & Component Count */}
        <div className="flex items-center gap-2 shrink-0">
          {onSaveAsContentPack && section.components.length > 0 && (
            <button
              type="button"
              onClick={() => onSaveAsContentPack(section)}
              title="Save section as reusable Content Pack"
              className="px-2 py-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Save as Pack</span>
            </button>
          )}

          <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
            {section.components.length} {section.components.length === 1 ? 'Component' : 'Components'}
          </span>

          {totalSections > 1 && !isApproved && (
            <button
              type="button"
              onClick={() => onDeleteSection(section.id)}
              title="Delete Section"
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Component Drop Zone & Grid */}
      <div ref={setDroppableRef} className="p-5 min-h-[120px]">
        {section.components.length === 0 ? (
          <div
            onClick={() => onAddComponentToSection(section.id)}
            className={`relative p-8 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl bg-slate-50/50 hover:bg-indigo-50/20 text-center transition-all cursor-pointer group space-y-2 ${isOver ? 'ring-2 ring-indigo-500/30 border-indigo-400 bg-indigo-50/30' : ''}`}
          >
            {isOver && (
              <div aria-hidden="true" className="pointer-events-none absolute left-4 right-4 top-2 h-1 rounded-full bg-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.14)]" />
            )}
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-700">Drag components here</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Or click here to select a field from the left toolbox to add to <span className="font-semibold text-slate-600">{section.title}</span>.
            </p>
          </div>
        ) : (
          <SortableContext items={componentIds} strategy={rectSortingStrategy}>
            <div className="wf-layout-grid" style={{ gap: spacing.componentGap }}>
              {section.components.map((comp, index) => (
                <BuilderComponent
                  key={comp.id}
                  component={comp}
                  templateTheme={templateTheme}
                  sectionId={section.id}
                  componentIndex={index}
                  isSelected={selectedComponentId === comp.id}
                  validationIssue={componentIssuesMap?.get(comp.id)}
                  onSelect={() => { onSelectSection(section.id); onSelectComponent(comp.id); }}
                  onDuplicate={() => onDuplicateComponent(comp.id)}
                  onDelete={() => onDeleteComponent(comp.id)}
                  onResize={(widthPercent) => onResizeComponent(comp.id, widthPercent)}
                  canResize={canResize}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
};
