import React, { useState, useEffect } from 'react';
import type { WidgetTemplate, TemplateSection, TemplateComponent, BuilderValidationIssue, ContentPack, ContentPackCategory, AdminPack, ContentLibraryItem, Category } from '../../types';
import { getBuilderValidationIssues } from '../../utils/builderValidation';
import { useApp } from '../../context/AppContext';
import { BuilderHeader } from './BuilderHeader';
import { resolveUserGovernanceLevel } from '../../utils/governanceUtils';
import { StudioRail, STUDIO_RAIL_ITEMS } from './StudioRail';
import type { StudioTab } from './StudioRail';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { StudioPanels } from './StudioPanels';
import { StudioWorkflowPanel } from './StudioWorkflowPanel';
import { StudioWelcomeModal } from './StudioWelcomeModal';
import { TOOLBOX_ITEMS } from './BuilderToolbox';
import type { ToolboxItem } from './BuilderToolbox';
import { BuilderCanvas } from './BuilderCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { QuickGuideOverlay } from './QuickGuideOverlay';
import { generateStableFieldKey } from './keyGenerator';
import { templateService } from '../../features/templates/services/templateService';
import { cloneContentPackSections } from '../../shared/contentPackUtils';
import { ContentPackPreviewModal } from './ContentPackPreviewModal';
import { SaveContentPackModal } from './SaveContentPackModal';
import { AddToPackModal } from './AddToPackModal';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { AlertCircle } from 'lucide-react';
import { adminPackToBuilderTemplate, builderTemplateToAdminPackPayload, cloneAdminPackForTemplate } from './adminPackCanvas';

interface TemplateBuilderProps {
  initialTemplate?: WidgetTemplate | null;
  initialPack?: AdminPack | null;
  mode?: 'template' | 'admin-pack';
  onSaveAdminPack?: (payload: ReturnType<typeof builderTemplateToAdminPackPayload>, initialPack: AdminPack | null) => Promise<void>;
  onPublishAdminPack?: (payload: ReturnType<typeof builderTemplateToAdminPackPayload>, initialPack: AdminPack | null) => Promise<void>;
  categoriesOverride?: Category[];
  onClose: () => void;
}

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ initialTemplate, initialPack = null, mode = 'template', onSaveAdminPack, onPublishAdminPack, categoriesOverride, onClose }) => {
  const { templates, categories: appCategories, categoriesLoading, currentUser, refreshTemplates, setActiveView, hasPermission } = useApp();
  const categories = categoriesOverride ?? appCategories;
  const categoriesReady = Boolean(categoriesOverride) || !categoriesLoading;
  const { isFeatureEnabled, isElementEnabled } = useSystemConfig();
  const isAdminPackMode = mode === 'admin-pack';
  const allowedStudioTabs = new Set<StudioTab>([
    ...(hasPermission('templates.view_approved') ? ['templates' as StudioTab] : []),
    ...(hasPermission('studio.elements.use') ? ['elements' as StudioTab] : []),
    ...(hasPermission('studio.content.use') ? ['content-library' as StudioTab] : []),
    ...(hasPermission('studio.standard_packs.use') || hasPermission('studio.my_packs.create') ? ['packs' as StudioTab] : []),
    ...(hasPermission('studio.text.use') ? ['text' as StudioTab] : []),
    ...(hasPermission('studio.sections.use') ? ['sections' as StudioTab] : []),
    ...(hasPermission('studio.data_fields.use') ? ['data-fields' as StudioTab] : []),
    ...(hasPermission('studio.themes.use') ? ['tools' as StudioTab] : []),
    ...(hasPermission('studio.workflow.use') ? ['workflow' as StudioTab] : []),
  ]);

  // Studio Shell States
  const [activeStudioTab, setActiveStudioTab] = useState<StudioTab>('elements');
  const [isStudioDrawerOpen, setIsStudioDrawerOpen] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Active Tab Safety: automatically redirect if activeStudioTab is disabled by Admin policy
  useEffect(() => {
    const adminPackTabs = new Set<StudioTab>(['elements', 'content-library', 'text', 'sections', 'data-fields']);
    const visibleRailItems = STUDIO_RAIL_ITEMS.filter((item) => isFeatureEnabled(item.featureKey) && (!isAdminPackMode ? allowedStudioTabs.has(item.id) : adminPackTabs.has(item.id)));
    if (visibleRailItems.length > 0 && !visibleRailItems.some((item) => item.id === activeStudioTab)) {
      setActiveStudioTab(visibleRailItems[0].id);
    }
  }, [isFeatureEnabled, activeStudioTab, isAdminPackMode]);

  // Create initial state
  const createEmptyTemplate = (): WidgetTemplate => {
    const activeCats = categories.filter((c) => (c as any).status !== 'Inactive');
    return {
      id: `tpl-${Date.now()}`,
      name: 'New Report Template',
      description: '',
      categoryId: activeCats[0]?.id || categories[0]?.id || '',
      version: 'v1.0',
    status: 'Draft',
    createdById: currentUser.id,
    createdByName: currentUser.name,
    createdByRole: currentUser.role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['Custom', 'Template'],
    sections: ['General Information'],
    dynamicSections: [
      {
        id: `sec-${Date.now()}-0`,
        title: 'General Information',
        order: 0,
        components: [],
      },
    ],
    fields: [],
    components: [],
  };
  };

  const setupInitialState = (tpl?: WidgetTemplate | null): WidgetTemplate => {
    if (!tpl) return createEmptyTemplate();

    // Ensure components & dynamicSections arrays exist
    const rawComps: any[] = (tpl as any).components || tpl.fields || [];
    const secMap = new Map<string, TemplateComponent[]>();

    const sectionTitles = tpl.sections && tpl.sections.length > 0 ? tpl.sections : ['General Information'];
    sectionTitles.forEach((st) => secMap.set(st, []));

    rawComps.forEach((c) => {
      const secName = c.section || sectionTitles[0] || 'General Information';
      if (!secMap.has(secName)) secMap.set(secName, []);
      secMap.get(secName)!.push({
        ...c,
        key: c.key || c.id,
        layoutWidth: c.layoutWidth || c.layout?.width || 'full',
      });
    });

    const dynamicSections: TemplateSection[] = Array.from(secMap.entries()).map(([title, comps], idx) => ({
      id: `sec-${tpl.id}-${idx}`,
      title,
      order: idx,
      components: comps,
    }));

    const allComps = dynamicSections.flatMap((s) => s.components);

    return {
      ...tpl,
      dynamicSections,
      components: allComps,
      fields: allComps as any,
    };
  };

  const [templateState, setTemplateState] = useState<WidgetTemplate>(() =>
    isAdminPackMode ? adminPackToBuilderTemplate(initialPack, currentUser) : setupInitialState(initialTemplate)
  );
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [activeHelpType, setActiveHelpType] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminPackMode || !categoriesReady || !initialTemplate) return;
    const categoryIsActive = categories.some(
      (category) => category.id === templateState.categoryId && (category.status === undefined || category.status === 'Active')
    );
    if (!categoryIsActive && templateState.categoryId) {
      setTemplateState((current) => ({ ...current, categoryId: '' }));
      setBuilderError('The previous category for this template is no longer available. Please select an active category.');
    }
  }, [categoriesReady, categories, initialTemplate, isAdminPackMode, templateState.categoryId]);

  // Content Pack States
  // Personal/user Pack persistence is intentionally deferred until its own Supabase cutover.
  const [contentPacks] = useState<ContentPack[]>([]);
  const [previewContentPack, setPreviewContentPack] = useState<ContentPack | null>(null);
  const [savePackSection, setSavePackSection] = useState<TemplateSection | null>(null);
  const [addToPackTool, setAddToPackTool] = useState<ToolboxItem | null>(null);

  const personalPacksUnavailable = (): never => {
    throw new Error('Personal Pack changes are unavailable until the personal Pack migration is complete.');
  };

  const handleAddToExistingPack = async (_packId: string, _payload: { sectionId?: string; newSectionName?: string; componentDef: any }) => {
    personalPacksUnavailable();
  };

  const handleCreateNewPackAndAdd = async (packData: { name: string; category: ContentPackCategory; description: string; firstSectionName: string; componentDef: any }) => {
    void packData;
    personalPacksUnavailable();
  };

  // Insert Content Pack
  const handleInsertContentPack = (pack: ContentPack) => {
    if (templateState.status === 'Approved') return;
    if (!pack || !Array.isArray(pack.sections) || pack.sections.length === 0) return;

    const currentSections = templateState.dynamicSections ? [...templateState.dynamicSections] : [];
    const clonedNewSections = cloneContentPackSections(pack.sections, currentSections);

    const updatedSections = [...currentSections, ...clonedNewSections];
    const updatedAllComps = updatedSections.flatMap((s) => s.components);

    const newState: WidgetTemplate = {
      ...templateState,
      dynamicSections: updatedSections,
      sections: updatedSections.map((s) => s.title),
      components: updatedAllComps,
      fields: updatedAllComps as any,
    };

    pushState(newState);

    if (clonedNewSections[0]?.components[0]?.id) {
      setSelectedComponentId(clonedNewSections[0].components[0].id);
    }
  };

  // Save Custom Content Pack
  const handleSaveCustomContentPack = async (data: { name: string; category: ContentPackCategory; description: string; section: TemplateSection }) => {
    void data;
    personalPacksUnavailable();
  };

  // Delete User Content Pack
  const handleDeleteContentPack = async (packId: string) => {
    void packId;
    personalPacksUnavailable();
  };

  // Insert Admin Standard Pack as a detached snapshot. Future Pack edits cannot mutate this template.
  const handleInsertAdminPack = (pack: AdminPack) => {
    if (templateState.status === 'Approved') return;

    const currentSections = templateState.dynamicSections ? [...templateState.dynamicSections] : [];
    const clonedSections = cloneAdminPackForTemplate(pack, currentSections);
    const updatedSections = [...currentSections, ...clonedSections];
    const updatedAllComps = updatedSections.flatMap((s) => s.components);

    const newState: WidgetTemplate = {
      ...templateState,
      dynamicSections: updatedSections,
      sections: updatedSections.map((s) => s.title),
      components: updatedAllComps,
      fields: updatedAllComps as any,
    };

    pushState(newState);

    if (clonedSections[0]?.components[0]?.id) {
      setSelectedComponentId(clonedSections[0].components[0].id);
    }
  };

  // Insert Shared Content Library item into active section
  const handleInsertContentItem = (item: ContentLibraryItem) => {
    if (templateState.status === 'Approved') return;

    if (item.contentType === 'Heading') {
      handleAddTextPreset({ type: 'heading', label: item.contentValue });
    } else {
      handleAddTextPreset({ type: 'paragraph', label: item.contentValue });
    }
  };

  // Undo / Redo History Stack (Max 30)
  const [historyStack, setHistoryStack] = useState<WidgetTemplate[]>([]);
  const [redoStack, setRedoStack] = useState<WidgetTemplate[]>([]);

  // Push new history state
  const pushState = (newState: WidgetTemplate) => {
    setHistoryStack((prev) => [...prev.slice(-29), templateState]);
    setRedoStack([]);
    setTemplateState(newState);
    setIsDirty(true);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setRedoStack((prev) => [templateState, ...prev]);
    setHistoryStack((prev) => prev.slice(0, -1));
    setTemplateState(previous);
    setIsDirty(true);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistoryStack((prev) => [...prev, templateState]);
    setRedoStack((prev) => prev.slice(1));
    setTemplateState(next);
    setIsDirty(true);
  };

  // Configure Sensors for Dnd-Kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Helper: flatten all components
  const getAllComponents = (tpl: WidgetTemplate = templateState): TemplateComponent[] => {
    if (!tpl.dynamicSections) return [];
    return tpl.dynamicSections.flatMap((s) => s.components);
  };

  // Find selected component object
  const selectedComponent = getAllComponents().find((c) => c.id === selectedComponentId) || null;

  // Start Blank Template Handler
  const handleStartBlank = () => {
    if (isDirty) {
      const confirmBlank = window.confirm('Discard current template changes and start a clean template?');
      if (!confirmBlank) return;
    }
    setTemplateState(createEmptyTemplate());
    setSelectedComponentId(null);
    setIsDirty(false);
  };

  // Start From Existing Approved Template (Clones schema as new draft)
  const handleStartFromTemplate = (sourceTemplate: WidgetTemplate) => {
    if (isDirty) {
      const confirmClone = window.confirm('Discard current template changes and start from selected template?');
      if (!confirmClone) return;
    }

    const clonedState = setupInitialState(sourceTemplate);
    const newDraftTemplate: WidgetTemplate = {
      ...clonedState,
      id: `tpl-${Date.now()}`,
      name: `${sourceTemplate.name} (Draft Copy)`,
      status: 'Draft',
      createdById: currentUser.id,
      createdByName: currentUser.name,
      createdByRole: currentUser.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTemplateState(newDraftTemplate);
    setSelectedComponentId(null);
    setIsDirty(true);
  };

  // Add Toolbox Item to target section
  const handleAddComponentToSection = (item: ToolboxItem, targetSectionId?: string) => {
    if (templateState.status === 'Approved') return;

    const sections = templateState.dynamicSections ? [...templateState.dynamicSections] : [];
    if (sections.length === 0) {
      sections.push({
        id: `sec-${Date.now()}`,
        title: 'General Information',
        order: 0,
        components: [],
      });
    }

    const targetSec = targetSectionId
      ? sections.find((s) => s.id === targetSectionId) || sections[0]
      : sections[0];

    const allComps = getAllComponents();
    const newKey = generateStableFieldKey(item.defaultLabel, allComps);
    const newCompId = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newComponent: TemplateComponent = {
      id: newCompId,
      type: item.type,
      key: newKey,
      label: item.defaultLabel,
      placeholder: item.defaultPlaceholder,
      required: false,
      section: targetSec.title,
      layoutWidth: 'full',
      layout: { width: 'full' },
      order: targetSec.components.length,
      options: item.defaultOptions ? item.defaultOptions.map((o) => ({ label: o, value: o })) : undefined,
      columns:
        item.type === 'table'
          ? item.defaultColumns || [
              { key: 'item', label: 'Item / Description', type: 'text', width: '40%' },
              { key: 'quantity', label: 'Quantity', type: 'number', width: '30%' },
              { key: 'unit_cost', label: 'Unit Cost ($)', type: 'currency', width: '30%' },
            ]
          : undefined,
      ratingConfig:
        item.type === 'rating'
          ? { min: 1, max: 5, step: 1, displayStyle: 'stars', lowLabel: 'Poor', highLabel: 'Excellent', showValue: true }
          : undefined,
      acknowledgementConfig:
        item.type === 'acknowledgement'
          ? { statementText: 'I confirm that the information provided in this request is accurate.', checkboxLabel: 'I Agree', captureTimestamp: true }
          : undefined,
      fileConfig:
        item.type === 'file'
          ? { allowedFileTypes: ['pdf', 'docx', 'png', 'jpeg'], maxFileSizeMb: 10, allowMultiple: false }
          : undefined,
    };

    const updatedSections = sections.map((sec) => {
      if (sec.id === targetSec.id) {
        return {
          ...sec,
          components: [...sec.components, newComponent],
        };
      }
      return sec;
    });

    const updatedAllComps = updatedSections.flatMap((s) => s.components);
    const newState: WidgetTemplate = {
      ...templateState,
      dynamicSections: updatedSections,
      sections: updatedSections.map((s) => s.title),
      components: updatedAllComps,
      fields: updatedAllComps as any,
    };

    pushState(newState);
    setSelectedComponentId(newCompId);
  };

  // Add Text Preset
  const handleAddTextPreset = (preset: { type: 'heading' | 'paragraph'; label: string }) => {
    const item = TOOLBOX_ITEMS.find((t) => t.type === preset.type) || TOOLBOX_ITEMS[0];
    handleAddComponentToSection({ ...item, defaultLabel: preset.label });
  };

  // Add Data Field Preset
  const handleAddDataFieldPreset = (preset: { type: any; label: string; key: string; placeholder?: string; options?: string[] }) => {
    const item = TOOLBOX_ITEMS.find((t) => t.type === preset.type) || TOOLBOX_ITEMS[0];
    handleAddComponentToSection({
      ...item,
      defaultLabel: preset.label,
      defaultPlaceholder: preset.placeholder,
      defaultOptions: preset.options,
    });
  };

  // Add Section
  const handleAddSection = () => {
    if (templateState.status === 'Approved') return;
    const sections = templateState.dynamicSections ? [...templateState.dynamicSections] : [];
    const secNum = sections.length + 1;
    const newTitle = `Section ${secNum}`;

    const newSec: TemplateSection = {
      id: `sec-${Date.now()}`,
      title: newTitle,
      order: sections.length,
      components: [],
    };

    const updatedSections = [...sections, newSec];
    const updatedAllComps = updatedSections.flatMap((s) => s.components);

    const newState: WidgetTemplate = {
      ...templateState,
      dynamicSections: updatedSections,
      sections: updatedSections.map((s) => s.title),
      components: updatedAllComps,
      fields: updatedAllComps as any,
    };

    pushState(newState);
  };

  // Rename Section
  const handleRenameSection = (secId: string, newTitle: string) => {
    if (templateState.status === 'Approved') return;
    const sections = templateState.dynamicSections || [];
    const updatedSections = sections.map((sec) => {
      if (sec.id === secId) {
        const updatedComps = sec.components.map((c) => ({ ...c, section: newTitle }));
        return { ...sec, title: newTitle, components: updatedComps };
      }
      return sec;
    });

    const updatedAllComps = updatedSections.flatMap((s) => s.components);
    const newState: WidgetTemplate = {
      ...templateState,
      dynamicSections: updatedSections,
      sections: updatedSections.map((s) => s.title),
      components: updatedAllComps,
      fields: updatedAllComps as any,
    };

    pushState(newState);
  };

  // Delete Section
  const handleDeleteSection = (secId: string) => {
    if (templateState.status === 'Approved') return;
    const sections = templateState.dynamicSections || [];
    if (sections.length <= 1) return;

    const updatedSections = sections.filter((s) => s.id !== secId);
    const updatedAllComps = updatedSections.flatMap((s) => s.components);

    const newState: WidgetTemplate = {
      ...templateState,
      dynamicSections: updatedSections,
      sections: updatedSections.map((s) => s.title),
      components: updatedAllComps,
      fields: updatedAllComps as any,
    };

    pushState(newState);
    setSelectedComponentId(null);
  };

  // Update Component Properties
  const handleUpdateComponent = (updatedComp: TemplateComponent) => {
    if (templateState.status === 'Approved') return;
    const sections = templateState.dynamicSections || [];
    const updatedSections = sections.map((sec) => ({
      ...sec,
      components: sec.components.map((c) => (c.id === updatedComp.id ? updatedComp : c)),
    }));

    const updatedAllComps = updatedSections.flatMap((s) => s.components);
    const newState: WidgetTemplate = {
      ...templateState,
      dynamicSections: updatedSections,
      components: updatedAllComps,
      fields: updatedAllComps as any,
    };

    pushState(newState);
  };

  // Duplicate Component
  const handleDuplicateComponent = (compId: string) => {
    if (templateState.status === 'Approved') return;
    const allComps = getAllComponents();
    const targetComp = allComps.find((c) => c.id === compId);
    if (!targetComp) return;

    const newKey = generateStableFieldKey(targetComp.label || 'field', allComps);
    const newCompId = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const duplicatedComp: TemplateComponent = {
      ...targetComp,
      id: newCompId,
      key: newKey,
    };

    const sections = templateState.dynamicSections || [];
    const updatedSections = sections.map((sec) => {
      const idx = sec.components.findIndex((c) => c.id === compId);
      if (idx !== -1) {
        const newComps = [...sec.components];
        newComps.splice(idx + 1, 0, duplicatedComp);
        return { ...sec, components: newComps };
      }
      return sec;
    });

    const updatedAllComps = updatedSections.flatMap((s) => s.components);
    const newState: WidgetTemplate = {
      ...templateState,
      dynamicSections: updatedSections,
      components: updatedAllComps,
      fields: updatedAllComps as any,
    };

    pushState(newState);
    setSelectedComponentId(newCompId);
  };

  // Delete Component
  const handleDeleteComponent = (compId: string) => {
    if (templateState.status === 'Approved') return;
    const sections = templateState.dynamicSections || [];
    const updatedSections = sections.map((sec) => ({
      ...sec,
      components: sec.components.filter((c) => c.id !== compId),
    }));

    const updatedAllComps = updatedSections.flatMap((s) => s.components);
    const newState: WidgetTemplate = {
      ...templateState,
      dynamicSections: updatedSections,
      components: updatedAllComps,
      fields: updatedAllComps as any,
    };

    pushState(newState);
    if (selectedComponentId === compId) {
      setSelectedComponentId(null);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.key === 'Escape') {
        setSelectedComponentId(null);
        setShowPreviewModal(false);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentId) {
          handleDeleteComponent(selectedComponentId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isAdminPackMode) handleSaveAdminPack();
        else handleSaveDraft();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentId, historyStack, redoStack, templateState, isAdminPackMode]);

  // Drag & Drop Handling
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.isToolboxItem) {
      const item: ToolboxItem = activeData.item;
      let targetSecId: string | undefined;

      if (overData?.isSectionDropZone) {
        targetSecId = overData.sectionId;
      } else if (overData?.isComponent) {
        const sec = templateState.dynamicSections?.find((s) => s.components.some((c) => c.id === over.id));
        targetSecId = sec?.id;
      }

      handleAddComponentToSection(item, targetSecId);
      return;
    }

    if (activeData?.isSection && overData?.isSection && active.id !== over.id) {
      const sections = templateState.dynamicSections || [];
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedSections = arrayMove(sections, oldIndex, newIndex).map((s, idx) => ({ ...s, order: idx }));
        const updatedAllComps = reorderedSections.flatMap((s) => s.components);
        pushState({
          ...templateState,
          dynamicSections: reorderedSections,
          sections: reorderedSections.map((s) => s.title),
          components: updatedAllComps,
          fields: updatedAllComps as any,
        });
      }
      return;
    }

    if (activeData?.isComponent && active.id !== over.id) {
      const sections = templateState.dynamicSections || [];
      let sourceSec = sections.find((s) => s.components.some((c) => c.id === active.id));
      let targetSec = sections.find((s) => s.components.some((c) => c.id === over.id));

      if (!targetSec && overData?.isSectionDropZone) {
        targetSec = sections.find((s) => s.id === overData.sectionId);
      }

      if (sourceSec && targetSec) {
        const activeComp = sourceSec.components.find((c) => c.id === active.id)!;

        if (sourceSec.id === targetSec.id) {
          const oldIndex = sourceSec.components.findIndex((c) => c.id === active.id);
          const newIndex = sourceSec.components.findIndex((c) => c.id === over.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedComps = arrayMove(sourceSec.components, oldIndex, newIndex);
            const updatedSections = sections.map((s) => (s.id === sourceSec!.id ? { ...s, components: reorderedComps } : s));
            const updatedAllComps = updatedSections.flatMap((s) => s.components);
            pushState({
              ...templateState,
              dynamicSections: updatedSections,
              components: updatedAllComps,
              fields: updatedAllComps as any,
            });
          }
        } else {
          const updatedSourceComps = sourceSec.components.filter((c) => c.id !== active.id);
          const updatedTargetComps = [...targetSec.components, { ...activeComp, section: targetSec.title }];
          const updatedSections = sections.map((s) => {
            if (s.id === sourceSec!.id) return { ...s, components: updatedSourceComps };
            if (s.id === targetSec!.id) return { ...s, components: updatedTargetComps };
            return s;
          });

          const updatedAllComps = updatedSections.flatMap((s) => s.components);
          pushState({
            ...templateState,
            dynamicSections: updatedSections,
            components: updatedAllComps,
            fields: updatedAllComps as any,
          });
        }
      }
    }
  };

  // Real-time Builder Validation Issues
  const validationIssues = getBuilderValidationIssues(templateState);
  const componentIssuesMap = new Map<string, BuilderValidationIssue>();
  validationIssues.forEach((issue) => {
    if (issue.componentId && !componentIssuesMap.has(issue.componentId)) {
      componentIssuesMap.set(issue.componentId, issue);
    }
  });

  const hasWorkflowErrors = validationIssues.some((i) => i.area === 'workflow');

  // Schema Validation Rules
  const validateBuilderSchema = (): boolean => {
    setBuilderError(null);
    if (!categoriesReady) {
      setBuilderError('Categories are still loading. Please wait before saving.');
      return false;
    }
    if (!templateState.name.trim()) {
      setBuilderError('Template name is required.');
      return false;
    }

    const selectedCategory = categories.find((category) => category.id === templateState.categoryId);
    if (!templateState.categoryId || !selectedCategory || (selectedCategory.status && selectedCategory.status !== 'Active')) {
      setBuilderError('Please select an active template category before saving.');
      return false;
    }

    const issues = getBuilderValidationIssues(templateState);
    if (issues.length > 0) {
      const firstIssue = issues[0];
      setBuilderError(firstIssue.message);
      const firstCompIssue = issues.find((i) => i.componentId);
      if (firstCompIssue?.componentId) {
        setSelectedComponentId(firstCompIssue.componentId);
        setTimeout(() => {
          const el = document.getElementById(firstCompIssue.componentId!);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      }
      return false;
    }
    return true;
  };

  // Save Draft API Call
  const handleSaveDraft = async () => {
    if (templateState.status === 'Approved') return;
    if (!validateBuilderSchema()) return;
    // Keep the return-for-revision context visible while the creator makes
    // incremental draft saves. Retain the loaded metadata in the editor state
    // if a save response omits it.
    const returnContext = templateState.returnedAt
      ? { returnedAt: templateState.returnedAt, returnReason: templateState.returnReason }
      : {};
    try {
      setIsSaving(true);
      setBuilderError(null);

      const saved = await templateService.saveDraft(templateState);
      await refreshTemplates();
      setTemplateState(setupInitialState({ ...saved, ...returnContext }));
      setIsDirty(false);
    } catch (err: any) {
      setBuilderError(err.message || 'Failed to save template draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAdminPack = async () => {
    if (!onSaveAdminPack) {
      setBuilderError('Pack persistence is unavailable.');
      return;
    }
    try {
      setIsSaving(true);
      setBuilderError(null);
      await onSaveAdminPack(builderTemplateToAdminPackPayload(templateState), initialPack);
      setIsDirty(false);
      onClose();
    } catch (err: any) {
      setBuilderError(err.message || 'Failed to save Standard Pack draft.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishAdminPack = async () => {
    if (!onPublishAdminPack || !initialPack?.draftVersionId) {
      setBuilderError('Save a draft before publishing this Standard Pack.');
      return;
    }
    try {
      setIsSaving(true);
      setBuilderError(null);
      await onPublishAdminPack(builderTemplateToAdminPackPayload(templateState), initialPack);
      setIsDirty(false);
      onClose();
    } catch (err: any) {
      setBuilderError(err.message || 'Failed to publish Standard Pack.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit for Approval API Call
  const handleSubmitForApproval = async () => {
    if (templateState.status === 'Approved') return;
    if (!validateBuilderSchema()) return;

    try {
      setIsSaving(true);
      setBuilderError(null);

      const saved = await templateService.saveDraft(templateState);
      await templateService.submit(saved.id);
      await refreshTemplates();

      setIsDirty(false);
      onClose();
      setActiveView('my-requests');
    } catch (err: any) {
      setBuilderError(err.message || 'Failed to submit template for approval.');
    } finally {
      setIsSaving(false);
    }
  };

  // Back Button
  const handleBack = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(isAdminPackMode
        ? 'You have unsaved Pack changes. Are you sure you want to discard them and return to Pack Management?'
        : 'You have unsaved template changes. Are you sure you want to discard changes and exit?');
      if (!confirmLeave) return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden animate-fade-in">
      {/* 1. Studio Header */}
      <BuilderHeader
        mode={mode}
        templateName={templateState.name}
        onNameChange={(name) => {
          pushState({ ...templateState, name });
        }}
        categoryId={templateState.categoryId || ''}
        onCategoryChange={(categoryId) => {
          pushState({ ...templateState, categoryId });
        }}
        categories={categories}
        status={templateState.status}
        isDirty={isDirty}
        canUndo={historyStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onBack={handleBack}
        onPreview={() => setShowPreviewModal(true)}
        onSaveDraft={handleSaveDraft}
        onSavePack={handleSaveAdminPack}
        onPublishPack={isAdminPackMode ? handlePublishAdminPack : undefined}
        isEditingPack={Boolean(initialPack)}
        onSubmitForApproval={handleSubmitForApproval}
        onCreateVersion={async () => {
          setIsSaving(true);
          try {
            const newVersionDraft = await templateService.createRevision(templateState.id) as WidgetTemplate;
            setTemplateState(setupInitialState(newVersionDraft));
            setSelectedComponentId(null);
            setIsDirty(false);
            setBuilderError(null);
          } catch (err: any) {
            setBuilderError(err.message || 'Failed to create new template version.');
          } finally {
            setIsSaving(false);
          }
        }}
        isSaving={isSaving}
        governanceLevel={resolveUserGovernanceLevel(currentUser)}
        canSubmit={hasPermission('templates.submit') && resolveUserGovernanceLevel(currentUser) !== 'None'}
      />

      {/* Error Alert */}
      {builderError && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between text-xs text-rose-800 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{builderError}</span>
          </div>
          <button
            onClick={() => setBuilderError(null)}
            className="text-rose-600 font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {templateState.returnedAt && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-xs text-amber-900">
          <div className="font-bold text-amber-800">Returned for Revision</div>
          <div className="mt-0.5">{templateState.returnReason || 'Please update this template before resubmitting it for approval.'}</div>
        </div>
      )}

      {/* 2. Main Studio Workspace Layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          {/* Far Left: Studio Navigation Rail */}
          <StudioRail
            mode={mode}
            activeTab={activeStudioTab}
            onSelectTab={(tab) => {
              setActiveStudioTab(tab);
              setIsStudioDrawerOpen(true);
            }}
            isDrawerOpen={isStudioDrawerOpen}
            onToggleDrawer={() => setIsStudioDrawerOpen((prev) => !prev)}
            hasWorkflowErrors={hasWorkflowErrors}
            allowedTabs={allowedStudioTabs}
          />

          {/* Expandable Left Tool Drawer */}
          {isStudioDrawerOpen && (
            activeStudioTab === 'workflow' ? (
              <StudioWorkflowPanel
                workflow={(templateState as any).workflow || null}
                components={getAllComponents()}
                onUpdateWorkflow={(newWorkflow: any) => {
                  pushState({ ...templateState, workflow: newWorkflow });
                }}
                onOpenHelp={(type) => setActiveHelpType(type)}
              />
            ) : (
              <StudioPanels
                builderMode={mode}
                activeTab={activeStudioTab}
                templates={templates}
                categories={categories}
                selectedCategoryFilter={selectedCategoryFilter}
                onSelectCategoryFilter={setSelectedCategoryFilter}
                onStartBlank={handleStartBlank}
                onStartFromTemplate={handleStartFromTemplate}
                onOpenImportModal={() => setShowImportModal(true)}
                onAddComponent={(item) => handleAddComponentToSection(item)}
                onAddTextPreset={handleAddTextPreset}
                onAddDataFieldPreset={handleAddDataFieldPreset}
                onAddPrebuiltBlock={(blockType) => {
                  if (blockType === 'employee') {
                    handleAddDataFieldPreset({ label: 'Employee Name', type: 'text', key: 'employee_name' });
                    handleAddDataFieldPreset({ label: 'Employee ID', type: 'text', key: 'employee_id' });
                    handleAddDataFieldPreset({ label: 'Department', type: 'select', key: 'department', options: ['Technology', 'Operations', 'Finance', 'HR'] });
                    handleAddDataFieldPreset({ label: 'Work Email', type: 'text', key: 'work_email', placeholder: 'employee@firm.com' });
                  } else if (blockType === 'request') {
                    handleAddDataFieldPreset({ label: 'Request Date', type: 'date', key: 'request_date' });
                    handleAddDataFieldPreset({ label: 'Priority', type: 'select', key: 'priority', options: ['Low', 'Medium', 'High', 'Urgent'] });
                    handleAddDataFieldPreset({ label: 'Request Description', type: 'textarea', key: 'request_description' });
                  } else if (blockType === 'budget') {
                    handleAddDataFieldPreset({ label: 'Requested Amount ($)', type: 'currency', key: 'requested_amount' });
                    handleAddDataFieldPreset({ label: 'Cost Center Code', type: 'text', key: 'cost_center' });
                    handleAddDataFieldPreset({ label: 'Budget Owner', type: 'text', key: 'budget_owner' });
                  } else if (blockType === 'approval') {
                    handleAddDataFieldPreset({ label: 'Assigned Reviewer', type: 'text', key: 'assigned_reviewer' });
                    handleAddDataFieldPreset({ label: 'Approval Decision', type: 'select', key: 'approval_decision', options: ['Approve', 'Return for Changes', 'Reject'] });
                    handleAddDataFieldPreset({ label: 'Review Date', type: 'date', key: 'review_date' });
                    handleAddDataFieldPreset({ label: 'Reviewer Comments', type: 'textarea', key: 'reviewer_comments' });
                  }
                }}
                contentPacks={contentPacks}
                onInsertPack={handleInsertContentPack}
                onPreviewPack={(pack) => setPreviewContentPack(pack)}
                onEditPack={(pack) => {
                  void pack;
                  setBuilderError('Personal Pack changes are unavailable until the personal Pack migration is complete.');
                }}
                onDeletePack={handleDeleteContentPack}
                onInsertAdminPack={handleInsertAdminPack}
                onInsertContentItem={handleInsertContentItem}
                onAddToPack={isAdminPackMode ? undefined : (item) => setAddToPackTool(item)}
                sections={templateState.dynamicSections || []}
                onSelectSection={(secId) => {
                  const sec = templateState.dynamicSections?.find((s) => s.id === secId);
                  if (sec && sec.components.length > 0) {
                    setSelectedComponentId(sec.components[0].id);
                  }
                }}
                onAddSection={handleAddSection}
                onOpenPreview={() => setShowPreviewModal(true)}
                isApproved={templateState.status === 'Approved'}
                templateTheme={templateState.theme || { preset: 'clean', accent: 'indigo', density: 'comfortable', pageStyle: 'plain' }}
                onUpdateTheme={(themeUpdates) => {
                  pushState({
                    ...templateState,
                    theme: {
                      ...(templateState.theme || { preset: 'clean', accent: 'indigo', density: 'comfortable', pageStyle: 'plain' }),
                      ...themeUpdates,
                    },
                  });
                }}
                onOpenHelp={(type) => setActiveHelpType(type)}
              />
            )
          )}

          {/* Central Workspace Canvas */}
          <BuilderCanvas
            sections={templateState.dynamicSections || []}
            selectedComponentId={selectedComponentId}
            componentIssuesMap={componentIssuesMap}
            onSelectComponent={(id) => setSelectedComponentId(id)}
            onDuplicateComponent={(id) => handleDuplicateComponent(id)}
            onDeleteComponent={(id) => handleDeleteComponent(id)}
            onRenameSection={handleRenameSection}
            onDeleteSection={handleDeleteSection}
            onAddSection={handleAddSection}
            onAddComponentToSection={(secId) => {
              const defaultItem = isAdminPackMode
                ? TOOLBOX_ITEMS.find((item) => isElementEnabled(`elements.${item.type}`))
                : TOOLBOX_ITEMS[0];
              if (defaultItem) handleAddComponentToSection(defaultItem, secId);
            }}
            onSaveAsContentPack={isAdminPackMode ? undefined : (sec) => setSavePackSection(sec)}
            onCanvasClick={() => setSelectedComponentId(null)}
            isApproved={templateState.status === 'Approved'}
          />

          {/* Right Contextual Properties & Settings Panel */}
          <PropertiesPanel
            builderMode={mode}
            selectedComponent={selectedComponent}
            componentValidationIssue={selectedComponentId ? componentIssuesMap.get(selectedComponentId) : undefined}
            onUpdateComponent={handleUpdateComponent}
            onDeleteComponent={handleDeleteComponent}
            onDeselect={() => setSelectedComponentId(null)}
            isDraft={templateState.status === 'Draft'}
            templateState={templateState}
            categories={categories}
            onUpdateTemplateSettings={(updates) => {
              pushState({
                ...templateState,
                ...updates,
              });
            }}
            onOpenHelp={(type) => setActiveHelpType(type)}
          />
        </div>

        <DragOverlay>
          {activeDragItem ? (
            <div className="p-3 bg-white border-2 border-indigo-500 rounded-xl shadow-xl font-bold text-xs text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>{activeDragItem.item?.label || activeDragItem.component?.label || 'Moving component'}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Quick Guide Overlay Portal */}
      <QuickGuideOverlay
        type={activeHelpType}
        isOpen={Boolean(activeHelpType)}
        onClose={() => setActiveHelpType(null)}
      />

      {/* Content Pack Preview Modal */}
      {previewContentPack && (
        <ContentPackPreviewModal
          pack={previewContentPack}
          onClose={() => setPreviewContentPack(null)}
          onInsert={handleInsertContentPack}
        />
      )}

      {/* Save Content Pack Modal */}
      {savePackSection && (
        <SaveContentPackModal
          section={savePackSection}
          onClose={() => setSavePackSection(null)}
          onSave={handleSaveCustomContentPack}
        />
      )}

      {/* Add To Pack Modal */}
      {addToPackTool && (
        <AddToPackModal
          toolItem={addToPackTool}
          userPacks={contentPacks.filter((p) => p.sourceType === 'user' && p.ownerUserId === currentUser.id)}
          onClose={() => setAddToPackTool(null)}
          onAddToExistingPack={handleAddToExistingPack}
          onCreateNewPackAndAdd={handleCreateNewPackAndAdd}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <TemplatePreviewModal
          template={templateState}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {/* Smart Template Intake Modal */}
      {showImportModal && (
        <StudioWelcomeModal
          templates={templates}
          categories={categories}
          onStartBlank={() => {
            handleStartBlank();
            setShowImportModal(false);
          }}
          onSelectExistingTemplate={(tpl) => {
            handleStartFromTemplate(tpl);
            setShowImportModal(false);
          }}
          onImportProposalReady={(proposal) => {
            const importedTpl = proposal.template;
            pushState({
              ...templateState,
              name: importedTpl.name || 'Imported Template',
              description: importedTpl.description || '',
              sections: importedTpl.sections || ['General Information'],
              dynamicSections: importedTpl.dynamicSections || [],
              components: importedTpl.components || [],
              workflow: importedTpl.workflow || null,
            });
            setShowImportModal(false);
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
};
