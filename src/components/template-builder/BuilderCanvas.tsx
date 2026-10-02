import type { TemplateSection, BuilderValidationIssue, TemplateTheme } from '../../types';
import { BuilderSection } from './BuilderSection';
import { Plus } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { resolveDocumentSpacing } from '../../shared/themeResolver';

interface BuilderCanvasProps {
  sections: TemplateSection[];
  templateTheme?: TemplateTheme;
  selectedSectionId?: string | null;
  selectedComponentId: string | null;
  componentIssuesMap?: Map<string, BuilderValidationIssue>;
  onSelectComponent: (id: string) => void;
  onSelectSection: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onRenameSection: (sectionId: string, newTitle: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddSection: () => void;
  onAddComponentToSection: (sectionId: string) => void;
  onSaveAsContentPack?: (section: TemplateSection) => void;
  onResizeComponent: (componentId: string, widthPercent: number) => void;
  canResize: boolean;
  onCanvasClick: () => void;
  isApproved: boolean;
}

export const BuilderCanvas: React.FC<BuilderCanvasProps> = ({
  sections,
  templateTheme,
  selectedSectionId,
  selectedComponentId,
  componentIssuesMap,
  onSelectComponent,
  onSelectSection,
  onDuplicateComponent,
  onDeleteComponent,
  onRenameSection,
  onDeleteSection,
  onAddSection,
  onAddComponentToSection,
  onSaveAsContentPack,
  onResizeComponent,
  canResize,
  onCanvasClick,
  isApproved,
}) => {
  const { setNodeRef: setCanvasDropRef, isOver } = useDroppable({
    id: 'builder-canvas-droppable',
    data: { isCanvasDropZone: true },
  });

  const sectionIds = sections.map((s) => s.id);
  const spacing = resolveDocumentSpacing(templateTheme);
  const themeBackground = templateTheme?.bgColor || '#f1f5f9';

  return (
    <main
      onClick={onCanvasClick}
      className="flex-1 min-w-0 w-full overflow-y-auto min-h-0 flex flex-col"
      style={{ backgroundColor: themeBackground, padding: spacing.pagePadding, gap: spacing.sectionGap }}
    >
      <div
        ref={setCanvasDropRef}
        className={`w-full max-w-none min-w-0 flex flex-col min-h-[500px] p-2 transition-all ${
          isOver ? 'ring-2 ring-indigo-500/30 rounded-2xl bg-indigo-50/10' : ''
        }`}
        style={{ gap: spacing.sectionGap }}
      >
        <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
          {sections.map((sec) => (
            <BuilderSection
              key={sec.id}
              section={sec}
              templateTheme={templateTheme}
              totalSections={sections.length}
              selectedSectionId={selectedSectionId}
              selectedComponentId={selectedComponentId}
              componentIssuesMap={componentIssuesMap}
              onSelectComponent={onSelectComponent}
              onSelectSection={onSelectSection}
              onDuplicateComponent={onDuplicateComponent}
              onDeleteComponent={onDeleteComponent}
              onRenameSection={onRenameSection}
              onDeleteSection={onDeleteSection}
              onAddComponentToSection={onAddComponentToSection}
              onSaveAsContentPack={onSaveAsContentPack}
              onResizeComponent={onResizeComponent}
              canResize={canResize}
              isApproved={isApproved}
            />
          ))}
        </SortableContext>

        {/* Add Section Button */}
        {!isApproved && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddSection();
              }}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Add New Section</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
