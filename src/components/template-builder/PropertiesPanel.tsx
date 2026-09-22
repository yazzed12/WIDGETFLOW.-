import React, { useState } from 'react';
import { apiService } from '../../services/apiService';
import type { TemplateComponent, ComponentOption, WidgetTemplate, Category, TableColumnConfig, TableAggregateConfig, BuilderValidationIssue } from '../../types';
import { Sliders, Trash2, Settings, Table as TableIcon, AlertCircle, Edit3, Plus, Calculator, HelpCircle, ArrowUp, ArrowDown, Copy, RotateCcw } from 'lucide-react';
import { TableColumnModal } from './TableColumnModal';
import { TableAggregateModal } from './TableAggregateModal';
import { RichParagraphEditor } from './RichParagraphEditor.js';
import { SAFE_FONT_FAMILIES } from '../../shared/themeResolver';
import { configurationService } from '../../features/configuration/services/configurationService';

interface PropertiesPanelProps {
  builderMode?: 'template' | 'admin-pack';
  selectedComponent: TemplateComponent | null;
  componentValidationIssue?: BuilderValidationIssue;
  onUpdateComponent: (updated: TemplateComponent) => void;
  onDeleteComponent: (id: string) => void;
  onDeselect: () => void;
  isDraft: boolean;
  templateState: WidgetTemplate;
  categories: Category[];
  onUpdateTemplateSettings: (updates: Partial<WidgetTemplate>) => void;
  onOpenHelp?: (type: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  builderMode = 'template',
  selectedComponent,
  componentValidationIssue,
  onUpdateComponent,
  onDeleteComponent,
  onDeselect,
  isDraft,
  templateState,
  categories,
  onUpdateTemplateSettings,
  onOpenHelp,
}) => {
  const [newOptionInput, setNewOptionInput] = useState('');
  const [newColName, setNewColName] = useState('');
  const [editingColModal, setEditingColModal] = useState<{ column: TableColumnConfig; index: number } | null>(null);
  const [editingAggregateModal, setEditingAggregateModal] = useState<{ aggregate: TableAggregateConfig; index: number } | null>(null);
  const [signatureRoles, setSignatureRoles] = useState<Array<{ key: string; name: string }>>([]);

  React.useEffect(() => {
    if (builderMode !== 'template') return;
    void configurationService.signatureRoleDirectory().then((rows) => {
      setSignatureRoles(rows.map((row) => ({ key: row.key, name: row.name })));
    }).catch(() => setSignatureRoles([]));
  }, [builderMode]);

  // 1. Template Settings View (When no component is selected)
  if (!selectedComponent) {
    if (builderMode === 'admin-pack') {
      return (
        <aside className="w-full lg:w-80 bg-slate-50/80 border-l border-slate-200 p-5 space-y-5 overflow-y-auto shrink-0 select-none">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Settings className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Pack Builder</h2>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
            <p className="text-xs font-bold text-slate-800">Select a canvas component</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Configure its supported properties here. The Pack name is managed in the top bar.
            </p>
          </div>
        </aside>
      );
    }
    return (
      <aside className="w-full lg:w-80 bg-slate-50/80 border-l border-slate-200 p-5 space-y-6 overflow-y-auto shrink-0 select-none">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Settings className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Template Settings</h2>
        </div>

        <div className="space-y-4">
          {/* Template Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Template Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={templateState.name || ''}
              onChange={(e) => onUpdateTemplateSettings({ name: e.target.value })}
              disabled={!isDraft}
              placeholder="e.g. Purchase Request"
              className={`w-full px-3 py-2 text-xs font-semibold text-slate-900 rounded-xl border ${
                isDraft ? 'bg-white border-slate-200 focus:border-indigo-500' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Category</label>
            <select
              value={templateState.categoryId || ''}
              onChange={(e) => onUpdateTemplateSettings({ categoryId: e.target.value })}
              disabled={!isDraft}
              className={`w-full px-3 py-2 text-xs text-slate-900 rounded-xl border font-medium cursor-pointer ${
                isDraft ? 'bg-white border-slate-200 focus:border-indigo-500' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Categories organize templates in WidgetFlow. The builder toolbox is identical for all categories.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Description</label>
            <textarea
              rows={3}
              value={templateState.description || ''}
              onChange={(e) => onUpdateTemplateSettings({ description: e.target.value })}
              disabled={!isDraft}
              placeholder="Standardized instructions for users filling this report template..."
              className={`w-full px-3 py-2 text-xs text-slate-900 rounded-xl border ${
                isDraft ? 'bg-white border-slate-200 focus:border-indigo-500' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            />
          </div>

          {/* Document Header & Footer Config */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Document Header & Footer</h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Document Subtitle</label>
              <input
                type="text"
                value={templateState.headerConfig?.subtitle || ''}
                onChange={(e) =>
                  onUpdateTemplateSettings({
                    headerConfig: { ...templateState.headerConfig, subtitle: e.target.value },
                  })
                }
                disabled={!isDraft}
                placeholder="e.g. Firm-wide Operations Intake Form"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Confidentiality Footer</label>
              <select
                value={templateState.footerConfig?.confidentialityLabel || 'Internal Use Only'}
                onChange={(e) =>
                  onUpdateTemplateSettings({
                    footerConfig: { ...templateState.footerConfig, confidentialityLabel: e.target.value },
                  })
                }
                disabled={!isDraft}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                <option value="Internal Use Only">Internal Use Only</option>
                <option value="Strictly Confidential">Strictly Confidential</option>
                <option value="Public Record">Public Record</option>
              </select>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // 2. Component Properties View
  const isContentComponent = selectedComponent.type === 'heading' || selectedComponent.type === 'paragraph';
  const hasOptions = selectedComponent.type === 'select' || selectedComponent.type === 'radio';

  const layoutWidth = (selectedComponent as any).layoutWidth || selectedComponent.layout?.width || 'full';
  const optionsList: ComponentOption[] = (selectedComponent.options || []).map((opt: any) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  const tableColumns: TableColumnConfig[] = selectedComponent.columns || [
    { key: 'col_desc', label: 'Item Description', type: 'text' },
    { key: 'col_qty', label: 'Quantity', type: 'number' },
    { key: 'col_cost', label: 'Unit Cost ($)', type: 'currency' },
    { key: 'col_total', label: 'Total ($)', type: 'currency' },
  ];

  const rawMin = selectedComponent.minRows !== undefined ? selectedComponent.minRows : selectedComponent.tableConfig?.minRows;
  const rawMax = selectedComponent.maxRows !== undefined ? selectedComponent.maxRows : selectedComponent.tableConfig?.maxRows;

  const numMin = rawMin !== undefined ? Number(rawMin) : 1;
  const numMax = rawMax !== undefined ? Number(rawMax) : 50;

  const isMinInvalid = isNaN(numMin) || numMin < 0 || !Number.isInteger(numMin);
  const isMaxInvalid = isNaN(numMax) || numMax < 1 || !Number.isInteger(numMax);
  const isRangeInvalid = !isMinInvalid && !isMaxInvalid && numMin > numMax;

  return (
    <aside className="w-full lg:w-80 bg-slate-50/80 border-l border-slate-200 p-5 space-y-6 overflow-y-auto shrink-0 select-none">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {selectedComponent.type} Properties
          </h2>
          {onOpenHelp && (
            <button
              type="button"
              aria-label={`Learn about ${selectedComponent.type}`}
              onClick={() => onOpenHelp(selectedComponent.type)}
              title="Quick Guide / Help"
              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={onDeselect}
          className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
        >
          Close
        </button>
      </div>

      {componentValidationIssue && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold uppercase text-[10px] text-rose-800 tracking-wider">Validation Error</p>
            <p className="mt-0.5 leading-snug">{componentValidationIssue.message}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Label */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">Field Label / Title</label>
          <input
            type="text"
            value={selectedComponent.label || ''}
            onChange={(e) => onUpdateComponent({ ...selectedComponent, label: e.target.value })}
            disabled={!isDraft}
            className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl"
          />
        </div>

        {/* Stable Field Key */}
        {!isContentComponent && selectedComponent.type !== 'divider' && selectedComponent.type !== 'spacer' && (
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Field Machine Key <span className="text-slate-400 font-normal">(snake_case)</span>
            </label>
            <input
              type="text"
              value={selectedComponent.key || ''}
              onChange={(e) => onUpdateComponent({ ...selectedComponent, key: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-xl text-slate-700"
            />
          </div>
        )}

        {/* Layout Width */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">Layout Width</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'full', label: 'Full' },
              { id: 'half', label: '50%' },
              { id: 'third', label: '33%' },
            ].map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() =>
                  onUpdateComponent({
                    ...selectedComponent,
                    layoutWidth: w.id as any,
                    layout: { width: w.id as any },
                  })
                }
                disabled={!isDraft}
                className={`py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  layoutWidth === w.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Required Toggle */}
        {!isContentComponent && selectedComponent.type !== 'divider' && selectedComponent.type !== 'spacer' && (
          <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs font-bold text-slate-800">Required Field</span>
            <input
              type="checkbox"
              checked={!!selectedComponent.required}
              onChange={(e) => onUpdateComponent({ ...selectedComponent, required: e.target.checked })}
              disabled={!isDraft}
              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
            />
          </div>
        )}

        {/* Section Heading Properties */}
        {selectedComponent.type === 'heading' && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Heading Settings</h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Heading Level</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'h1', label: 'Large Heading (H1)' },
                  { id: 'h2', label: 'Section (H2)' },
                  { id: 'h3', label: 'Sub (H3)' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() =>
                      onUpdateComponent({
                        ...selectedComponent,
                        headingConfig: {
                          ...selectedComponent.headingConfig,
                          headingLevel: lvl.id as any,
                        },
                      })
                    }
                    className={`py-1 text-xs font-bold rounded-lg border ${
                      (selectedComponent.headingConfig?.headingLevel || 'h2') === lvl.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {lvl.id.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Subtitle / Supporting Text</label>
              <input
                type="text"
                value={selectedComponent.headingConfig?.subtitle || selectedComponent.description || ''}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    headingConfig: {
                      ...selectedComponent.headingConfig,
                      subtitle: e.target.value,
                    },
                    description: e.target.value,
                  })
                }
                placeholder="e.g. Please provide itemized details below"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700">Typography & Color</label>
              <button
                type="button"
                onClick={() =>
                  onUpdateComponent({
                    ...selectedComponent,
                    headingConfig: {
                      ...selectedComponent.headingConfig,
                      fontFamily: 'theme',
                      fontSize: 'theme',
                      fontWeight: 'theme',
                      fontColor: 'theme',
                      textColor: 'default',
                    },
                  })
                }
                title="Reset local overrides to global Theme"
                className="px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset to Theme
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Font Family</label>
              <select
                value={selectedComponent.headingConfig?.fontFamily || 'theme'}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    headingConfig: {
                      ...selectedComponent.headingConfig,
                      fontFamily: e.target.value,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
              >
                <option value="theme">Theme Default (Inherit)</option>
                {SAFE_FONT_FAMILIES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Font Size</label>
                <select
                  value={selectedComponent.headingConfig?.fontSize || 'medium'}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      headingConfig: {
                        ...selectedComponent.headingConfig,
                        fontSize: e.target.value as any,
                      },
                    })
                  }
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-xl font-medium"
                >
                  <option value="theme">Theme Default</option>
                  <option value="small">Small (14px)</option>
                  <option value="medium">Medium (16px)</option>
                  <option value="large">Large (20px)</option>
                  <option value="xlarge">Extra Large (24px)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Font Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={
                      selectedComponent.headingConfig?.fontColor && selectedComponent.headingConfig.fontColor !== 'theme'
                        ? selectedComponent.headingConfig.fontColor
                        : '#0f172a'
                    }
                    onChange={(e) =>
                      onUpdateComponent({
                        ...selectedComponent,
                        headingConfig: {
                          ...selectedComponent.headingConfig,
                          fontColor: e.target.value,
                        },
                      })
                    }
                    className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="Theme Default"
                    value={selectedComponent.headingConfig?.fontColor || 'theme'}
                    onChange={(e) =>
                      onUpdateComponent({
                        ...selectedComponent,
                        headingConfig: {
                          ...selectedComponent.headingConfig,
                          fontColor: e.target.value,
                        },
                      })
                    }
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Text Style</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedComponent.headingConfig?.fontWeight === 'bold'}
                    onChange={(e) =>
                      onUpdateComponent({
                        ...selectedComponent,
                        headingConfig: {
                          ...selectedComponent.headingConfig,
                          fontWeight: e.target.checked ? 'bold' : 'normal',
                        },
                      })
                    }
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span>Bold</span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedComponent.headingConfig?.italic)}
                    onChange={(e) =>
                      onUpdateComponent({
                        ...selectedComponent,
                        headingConfig: {
                          ...selectedComponent.headingConfig,
                          italic: e.target.checked,
                        },
                      })
                    }
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span>Italic</span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedComponent.headingConfig?.underline)}
                    onChange={(e) =>
                      onUpdateComponent({
                        ...selectedComponent,
                        headingConfig: {
                          ...selectedComponent.headingConfig,
                          underline: e.target.checked,
                        },
                      })
                    }
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span>Underline</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Alignment</label>
              <div className="grid grid-cols-3 gap-1">
                {['left', 'center', 'right'].map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() =>
                      onUpdateComponent({
                        ...selectedComponent,
                        alignment: align as any,
                        headingConfig: {
                          ...selectedComponent.headingConfig,
                          alignment: align as any,
                        },
                      })
                    }
                    className={`py-1 text-xs font-bold capitalize rounded-lg border ${
                      (selectedComponent.headingConfig?.alignment || selectedComponent.alignment || 'left') === align
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-700'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Paragraph Text Properties */}
        {selectedComponent.type === 'paragraph' && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <RichParagraphEditor
              value={selectedComponent.paragraphConfig?.contentHtml || selectedComponent.label || selectedComponent.description || ''}
              onChange={(sanitizedHtml) =>
                onUpdateComponent({
                  ...selectedComponent,
                  label: sanitizedHtml,
                  description: sanitizedHtml,
                  paragraphConfig: {
                    ...selectedComponent.paragraphConfig,
                    contentHtml: sanitizedHtml,
                  },
                })
              }
            />
          </div>
        )}

        {/* Divider Properties */}
        {selectedComponent.type === 'divider' && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Divider Settings</h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Line Style</label>
              <div className="grid grid-cols-3 gap-1">
                {['solid', 'dashed', 'dotted'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() =>
                      onUpdateComponent({
                        ...selectedComponent,
                        dividerConfig: {
                          ...selectedComponent.dividerConfig,
                          dividerStyle: st as any,
                        },
                      })
                    }
                    className={`py-1 text-xs font-bold capitalize rounded-lg border ${
                      (selectedComponent.dividerConfig?.dividerStyle || 'solid') === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Thickness</label>
                <select
                  value={selectedComponent.dividerConfig?.thickness || 'thin'}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      dividerConfig: {
                        ...selectedComponent.dividerConfig,
                        thickness: e.target.value as any,
                      },
                    })
                  }
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-xl font-medium"
                >
                  <option value="thin">Thin (1px)</option>
                  <option value="medium">Medium (2px)</option>
                  <option value="thick">Thick (4px)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Width</label>
                <select
                  value={selectedComponent.dividerConfig?.width || 'full'}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      dividerConfig: {
                        ...selectedComponent.dividerConfig,
                        width: e.target.value as any,
                      },
                    })
                  }
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-xl font-medium"
                >
                  <option value="full">Full Width (100%)</option>
                  <option value="75%">75% Width</option>
                  <option value="50%">50% Width</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Layout Spacer Properties */}
        {selectedComponent.type === 'spacer' && (() => {
          const currentHeightPx = (() => {
            const sConf = selectedComponent.spacerConfig || {};
            if (typeof sConf.heightPx === 'number' && !isNaN(sConf.heightPx)) {
              return Math.min(Math.max(Math.round(sConf.heightPx), 4), 200);
            }
            const size = sConf.spacerSize || selectedComponent.size || 'md';
            const heightPresetMap: Record<string, number> = {
              xs: 8,
              extra_small: 8,
              sm: 16,
              small: 16,
              md: 32,
              medium: 32,
              lg: 48,
              large: 48,
              xl: 72,
              extra_large: 72,
            };
            return heightPresetMap[size] || 32;
          })();

          return (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase">Spacer Height</h3>
                <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  Current spacing: {currentHeightPx}px
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Height Presets</label>
                <div className="grid grid-cols-5 gap-1 text-[10px] font-bold">
                  {[
                    { id: 'xs', px: 8, label: 'X-Small' },
                    { id: 'sm', px: 16, label: 'Small' },
                    { id: 'md', px: 32, label: 'Medium' },
                    { id: 'lg', px: 48, label: 'Large' },
                    { id: 'xl', px: 72, label: 'X-Large' },
                  ].map((sp) => {
                    const isSelected =
                      (selectedComponent.spacerConfig?.spacerSize || selectedComponent.size || 'md') === sp.id &&
                      selectedComponent.spacerConfig?.spacerSize !== 'custom';
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() =>
                          onUpdateComponent({
                            ...selectedComponent,
                            size: sp.id as any,
                            spacerConfig: {
                              ...selectedComponent.spacerConfig,
                              spacerSize: sp.id as any,
                              heightPx: sp.px,
                            },
                          })
                        }
                        className={`py-1.5 px-1 rounded-lg border text-center transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-bold">{sp.label}</div>
                        <div className="text-[9px] opacity-80">{sp.px}px</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Custom Height <span className="text-slate-400 font-normal">(4px – 200px)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="4"
                    max="200"
                    step="1"
                    value={currentHeightPx}
                    onChange={(e) => {
                      const val = Math.min(Math.max(parseInt(e.target.value) || 32, 4), 200);
                      onUpdateComponent({
                        ...selectedComponent,
                        spacerConfig: {
                          ...selectedComponent.spacerConfig,
                          spacerSize: 'custom',
                          heightPx: val,
                        },
                      });
                    }}
                    className="flex-1 accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="4"
                      max="200"
                      value={currentHeightPx}
                      onChange={(e) => {
                        const val = Math.min(Math.max(parseInt(e.target.value) || 32, 4), 200);
                        onUpdateComponent({
                          ...selectedComponent,
                          spacerConfig: {
                            ...selectedComponent.spacerConfig,
                            spacerSize: 'custom',
                            heightPx: val,
                          },
                        });
                      }}
                      className="w-16 px-2 py-1 text-xs font-mono text-center font-bold bg-white border border-slate-200 rounded-lg"
                    />
                    <span className="text-xs text-slate-500 font-bold">px</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Image Component Properties */}
        {selectedComponent.type === 'image' && (() => {
          const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
              const reader = new FileReader();
              reader.onload = async () => {
                const base64Data = reader.result as string;
                const data = await apiService.uploadTemplateAsset({ filename: file.name, mimeType: file.type, base64Data, linkedTemplateId: templateState.id });
                if (data) {
                  onUpdateComponent({
                    ...selectedComponent,
                    assetUrl: data.url,
                    assetId: data.id,
                    imageConfig: {
                      ...selectedComponent.imageConfig,
                      assetUrl: data.url,
                      assetId: data.id,
                    },
                  });
                }
              };
              reader.readAsDataURL(file);
            } catch (err) {
              console.error('Failed to upload image asset:', err);
            }
          };

          return (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase">Image Asset</h3>

              {/* Upload Image Button */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Upload Image File</label>
                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 border border-dashed border-indigo-300 rounded-xl text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer text-xs font-bold">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Choose Image File (PNG, JPEG, WebP)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleAssetUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Asset URL / Reference ID</label>
                <input
                  type="text"
                  value={selectedComponent.imageConfig?.assetUrl || selectedComponent.assetUrl || selectedComponent.assetId || ''}
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    const normalizedUrl =
                      rawVal.startsWith('http://') || rawVal.startsWith('https://') || rawVal.startsWith('/api/assets/')
                        ? rawVal
                        : rawVal.startsWith('asset-')
                        ? `/api/assets/${rawVal}`
                        : rawVal;

                    onUpdateComponent({
                      ...selectedComponent,
                      assetUrl: normalizedUrl,
                      imageConfig: {
                        ...selectedComponent.imageConfig,
                        assetUrl: normalizedUrl,
                      },
                    });
                  }}
                  placeholder="https://... or /api/assets/asset-xxx"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Alt Text (Accessibility)</label>
                <input
                  type="text"
                  value={selectedComponent.imageConfig?.altText || selectedComponent.altText || ''}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      altText: e.target.value,
                      imageConfig: {
                        ...selectedComponent.imageConfig,
                        altText: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Official Corporate Brand Logo"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Image Width</label>
                  <select
                    value={selectedComponent.imageConfig?.imageWidth || 'medium'}
                    onChange={(e) =>
                      onUpdateComponent({
                        ...selectedComponent,
                        imageConfig: {
                          ...selectedComponent.imageConfig,
                          imageWidth: e.target.value as any,
                        },
                      })
                    }
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="small">Small (25%)</option>
                    <option value="medium">Medium (50%)</option>
                    <option value="large">Large (75%)</option>
                    <option value="full">Full Width (100%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Fit Mode</label>
                  <select
                    value={selectedComponent.imageConfig?.fitMode || 'contain'}
                    onChange={(e) =>
                      onUpdateComponent({
                        ...selectedComponent,
                        imageConfig: {
                          ...selectedComponent.imageConfig,
                          fitMode: e.target.value as any,
                        },
                      })
                    }
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="contain">Contain Aspect</option>
                    <option value="cover">Cover Fill</option>
                    <option value="natural">Natural Dimensions</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Alignment</label>
                <div className="grid grid-cols-3 gap-1">
                  {['left', 'center', 'right'].map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() =>
                        onUpdateComponent({
                          ...selectedComponent,
                          alignment: align as any,
                          imageConfig: {
                            ...selectedComponent.imageConfig,
                            alignment: align as any,
                          },
                        })
                      }
                      className={`py-1 text-xs font-bold capitalize rounded-lg border ${
                        (selectedComponent.imageConfig?.alignment || selectedComponent.alignment || 'center') === align
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-700'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Caption Text</label>
                <input
                  type="text"
                  value={selectedComponent.imageConfig?.caption || selectedComponent.caption || ''}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      caption: e.target.value,
                      imageConfig: {
                        ...selectedComponent.imageConfig,
                        caption: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Figure 1 — Approved Organization Structure"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          );
        })()}

        {/* Info Box Callout Properties */}
        {selectedComponent.type === 'info_box' && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Callout Settings</h3>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Callout Preset</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'info', label: 'ⓘ Information' },
                  { id: 'warning', label: '⚠ Warning' },
                  { id: 'success', label: '✓ Success' },
                  { id: 'important', label: '⛔ Critical' },
                  { id: 'neutral', label: 'ℹ Neutral' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      onUpdateComponent({
                        ...selectedComponent,
                        stylePreset: p.id as any,
                        infoBoxConfig: {
                          ...selectedComponent.infoBoxConfig,
                          stylePreset: p.id as any,
                        },
                      })
                    }
                    className={`py-1.5 text-xs font-bold rounded-xl border ${
                      (selectedComponent.infoBoxConfig?.stylePreset || selectedComponent.stylePreset || 'info') === p.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-bold text-slate-800">Show Preset Icon</span>
              <input
                type="checkbox"
                checked={selectedComponent.infoBoxConfig?.showIcon !== false}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    infoBoxConfig: {
                      ...selectedComponent.infoBoxConfig,
                      showIcon: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Date / Datetime Validation Limits */}
        {(selectedComponent.type === 'date' || selectedComponent.type === 'datetime') && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Date Constraints</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Minimum Date</label>
                <input
                  type={selectedComponent.type === 'datetime' ? 'datetime-local' : 'date'}
                  value={selectedComponent.validation?.minDate || ''}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      validation: { ...selectedComponent.validation, minDate: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Maximum Date</label>
                <input
                  type={selectedComponent.type === 'datetime' ? 'datetime-local' : 'date'}
                  value={selectedComponent.validation?.maxDate || ''}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      validation: { ...selectedComponent.validation, maxDate: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Rating Properties */}
        {selectedComponent.type === 'rating' && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Rating Settings</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Min Rating</label>
                <input
                  type="number"
                  value={selectedComponent.ratingConfig?.min !== undefined ? selectedComponent.ratingConfig.min : 1}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      ratingConfig: {
                        ...selectedComponent.ratingConfig,
                        min: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Max Rating</label>
                <input
                  type="number"
                  value={selectedComponent.ratingConfig?.max !== undefined ? selectedComponent.ratingConfig.max : 5}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      ratingConfig: {
                        ...selectedComponent.ratingConfig,
                        max: parseInt(e.target.value) || 5,
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Display Style</label>
              <div className="grid grid-cols-3 gap-1 text-xs">
                {[
                  { id: 'stars', label: 'Stars ★' },
                  { id: 'numbers', label: 'Numbers [1]' },
                  { id: 'buttons', label: 'Buttons' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      onUpdateComponent({
                        ...selectedComponent,
                        ratingConfig: {
                          ...selectedComponent.ratingConfig,
                          displayStyle: s.id as any,
                        },
                      })
                    }
                    className={`py-1 rounded-lg border font-bold ${
                      (selectedComponent.ratingConfig?.displayStyle || 'stars') === s.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Low End Label</label>
                <input
                  type="text"
                  placeholder="e.g. Poor"
                  value={selectedComponent.ratingConfig?.lowLabel || ''}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      ratingConfig: { ...selectedComponent.ratingConfig, lowLabel: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">High End Label</label>
                <input
                  type="text"
                  placeholder="e.g. Excellent"
                  value={selectedComponent.ratingConfig?.highLabel || ''}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      ratingConfig: { ...selectedComponent.ratingConfig, highLabel: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs pt-1">
              <input
                type="checkbox"
                checked={selectedComponent.ratingConfig?.showValue !== false}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    ratingConfig: { ...selectedComponent.ratingConfig, showValue: e.target.checked },
                  })
                }
                className="w-3.5 h-3.5 text-indigo-600 rounded"
              />
              <span className="font-semibold text-slate-700">Show Selected Value Badge</span>
            </label>
          </div>
        )}

        {/* Acknowledgement Properties */}
        {selectedComponent.type === 'acknowledgement' && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Acknowledgement Statement</h3>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Statement Text</label>
              <textarea
                rows={3}
                placeholder="I confirm that the information provided in this request is accurate..."
                value={selectedComponent.acknowledgementConfig?.statementText || ''}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    acknowledgementConfig: { ...selectedComponent.acknowledgementConfig, statementText: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Checkbox Label</label>
              <input
                type="text"
                placeholder="I Agree"
                value={selectedComponent.acknowledgementConfig?.checkboxLabel || ''}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    acknowledgementConfig: { ...selectedComponent.acknowledgementConfig, checkboxLabel: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs pt-1">
              <input
                type="checkbox"
                checked={selectedComponent.acknowledgementConfig?.captureTimestamp !== false}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    acknowledgementConfig: {
                      ...selectedComponent.acknowledgementConfig,
                      captureTimestamp: e.target.checked,
                    },
                  })
                }
                className="w-3.5 h-3.5 text-indigo-600 rounded"
              />
              <span className="font-semibold text-slate-700">Record Acknowledgement Timestamp</span>
            </label>
          </div>
        )}

        {/* File Attachment Properties */}
        {selectedComponent.type === 'file' && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Attachment Settings</h3>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Allowed File Extensions</label>
              <input
                type="text"
                placeholder="pdf, docx, xlsx, png, jpeg"
                value={(selectedComponent.fileConfig?.allowedFileTypes || ['pdf', 'docx', 'png', 'jpeg']).join(', ')}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    fileConfig: {
                      ...selectedComponent.fileConfig,
                      allowedFileTypes: e.target.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Comma-separated list (e.g. pdf, docx, xlsx, png)</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Max File Size (MB)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={selectedComponent.fileConfig?.maxFileSizeMb || 10}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    fileConfig: {
                      ...selectedComponent.fileConfig,
                      maxFileSizeMb: parseInt(e.target.value) || 10,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Signature Field Properties */}
        {selectedComponent.type === 'signature' && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Signer Authorization Settings</h3>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Confirmation Statement</label>
              <textarea
                rows={3}
                placeholder="I confirm that all information provided in this request is accurate and complete..."
                value={selectedComponent.signatureConfig?.confirmationStatement || ''}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    signatureConfig: { ...selectedComponent.signatureConfig, confirmationStatement: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={selectedComponent.signatureConfig?.captureSignerName !== false}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      signatureConfig: { ...selectedComponent.signatureConfig, captureSignerName: e.target.checked },
                    })
                  }
                  className="w-3.5 h-3.5 text-indigo-600 rounded"
                />
                <span className="font-semibold text-slate-700">Capture Signer Full Name</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={selectedComponent.signatureConfig?.captureTimestamp !== false}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      signatureConfig: { ...selectedComponent.signatureConfig, captureTimestamp: e.target.checked },
                    })
                  }
                  className="w-3.5 h-3.5 text-indigo-600 rounded"
                />
                <span className="font-semibold text-slate-700">Record Signer Timestamp</span>
              </label>
            </div>
          </div>
        )}

        {/* KPI Metric Properties */}
        {selectedComponent.type === 'kpi' && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Metric Settings</h3>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Value Type</label>
              <select
                value={selectedComponent.kpiConfig?.valueType || selectedComponent.kpiConfig?.format || 'currency'}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    kpiConfig: { ...selectedComponent.kpiConfig, valueType: e.target.value as any, format: e.target.value as any },
                  })
                }
                className="w-full p-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="currency">Currency ($)</option>
                <option value="percentage">Percentage (%)</option>
                <option value="number">Numeric Count</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Value</label>
                <input
                  type="text"
                  placeholder="e.g. 100000"
                  value={selectedComponent.kpiConfig?.targetValue || ''}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      kpiConfig: { ...selectedComponent.kpiConfig, targetValue: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Trend Badge</label>
                <select
                  value={selectedComponent.kpiConfig?.trend || 'up'}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      kpiConfig: { ...selectedComponent.kpiConfig, trend: e.target.value as any },
                    })
                  }
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="up">Trending Up (▲)</option>
                  <option value="down">Trending Down (▼)</option>
                  <option value="neutral">Neutral (•)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Helper / Context Text</label>
              <input
                type="text"
                placeholder="e.g. Approved Q3 budget ceiling"
                value={selectedComponent.kpiConfig?.helperText || ''}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    kpiConfig: { ...selectedComponent.kpiConfig, helperText: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Repeating Group Properties */}
        {selectedComponent.type === 'repeating_group' && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Repeating Group Settings</h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Group Title</label>
                <input
                  type="text"
                  placeholder="Emergency Contacts"
                  value={selectedComponent.repeatingGroupConfig?.groupTitle || selectedComponent.label || ''}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      label: e.target.value,
                      repeatingGroupConfig: { ...selectedComponent.repeatingGroupConfig, groupTitle: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Item Singular Label</label>
                <input
                  type="text"
                  placeholder="Contact"
                  value={selectedComponent.repeatingGroupConfig?.itemLabel || 'Contact'}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      repeatingGroupConfig: { ...selectedComponent.repeatingGroupConfig, itemLabel: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Min Items</label>
                <input
                  type="number"
                  min={1}
                  value={selectedComponent.repeatingGroupConfig?.minItems !== undefined ? selectedComponent.repeatingGroupConfig.minItems : selectedComponent.minRows || 1}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      minRows: parseInt(e.target.value) || 1,
                      repeatingGroupConfig: { ...selectedComponent.repeatingGroupConfig, minItems: parseInt(e.target.value) || 1 },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Max Items</label>
                <input
                  type="number"
                  min={1}
                  value={selectedComponent.repeatingGroupConfig?.maxItems !== undefined ? selectedComponent.repeatingGroupConfig.maxItems : selectedComponent.maxRows || 5}
                  onChange={(e) =>
                    onUpdateComponent({
                      ...selectedComponent,
                      maxRows: parseInt(e.target.value) || 5,
                      repeatingGroupConfig: { ...selectedComponent.repeatingGroupConfig, maxItems: parseInt(e.target.value) || 5 },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Table V2 Settings & Columns Editor */}
        {selectedComponent.type === 'table' && (
          <div className="space-y-4 pt-2 border-t border-slate-200">
              {/* Table Level Settings */}
              <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1">
                  <TableIcon className="w-3.5 h-3.5 text-indigo-600" /> Table Settings & Limits
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Min Rows</label>
                    <input
                      type="number"
                      min={0}
                      value={rawMin !== undefined ? String(rawMin) : '1'}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        const valNum = valStr === '' ? 0 : parseInt(valStr, 10);
                        const finalVal = isNaN(valNum) ? 0 : valNum;
                        onUpdateComponent({
                          ...selectedComponent,
                          minRows: finalVal,
                          tableConfig: {
                            ...selectedComponent.tableConfig,
                            minRows: finalVal,
                          },
                        });
                      }}
                      className={`w-full px-2.5 py-1.5 bg-white border rounded-xl text-xs font-semibold ${
                        isMinInvalid || isRangeInvalid
                          ? 'border-rose-500 bg-rose-50 text-rose-900 focus:border-rose-600'
                          : 'border-slate-200 text-slate-900 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Max Rows</label>
                    <input
                      type="number"
                      min={1}
                      value={rawMax !== undefined ? String(rawMax) : '50'}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        const valNum = valStr === '' ? 1 : parseInt(valStr, 10);
                        const finalVal = isNaN(valNum) ? 1 : valNum;
                        onUpdateComponent({
                          ...selectedComponent,
                          maxRows: finalVal,
                          tableConfig: {
                            ...selectedComponent.tableConfig,
                            maxRows: finalVal,
                          },
                        });
                      }}
                      className={`w-full px-2.5 py-1.5 bg-white border rounded-xl text-xs font-semibold ${
                        isMaxInvalid || isRangeInvalid
                          ? 'border-rose-500 bg-rose-50 text-rose-900 focus:border-rose-600'
                          : 'border-slate-200 text-slate-900 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                </div>

                {isRangeInvalid ? (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Maximum rows must be greater than or equal to Minimum rows.</span>
                  </div>
                ) : isMinInvalid ? (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Minimum rows must be a non-negative integer (0 or greater).</span>
                  </div>
                ) : isMaxInvalid ? (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Maximum rows must be a positive integer (1 or greater).</span>
                  </div>
                ) : null}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={selectedComponent.showRowNumbers !== false}
                    onChange={(e) => onUpdateComponent({ ...selectedComponent, showRowNumbers: e.target.checked })}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span className="font-semibold text-slate-700">Row Numbers</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={selectedComponent.showFooter !== false}
                    onChange={(e) => onUpdateComponent({ ...selectedComponent, showFooter: e.target.checked })}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span className="font-semibold text-slate-700">Table Footer</span>
                </label>
              </div>
            </div>

            {/* Table Columns Config List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase">Columns ({tableColumns.length})</h3>
              </div>

              {tableColumns.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Add at least one column to this table before submitting the template.</span>
                </div>
              )}

              <div className="space-y-2">
                {tableColumns.map((col, idx) => (
                  <div
                    key={col.key || idx}
                    className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-xs transition-all hover:border-indigo-200"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{col.label}</span>
                        {col.required && <span className="text-rose-500 font-bold">*</span>}
                        {col.type === 'calculated' && (
                          <span className="text-[9px] font-mono text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded">
                            Formula
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {col.type} • key: {col.key}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingColModal({ column: col, index: idx })}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Configure Column Settings"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedCols = tableColumns.filter((_, i) => i !== idx);
                          onUpdateComponent({ ...selectedComponent, columns: updatedCols });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete Column"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="New column label..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newColName.trim()) return;
                    const rawKey = newColName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                    const colKey = rawKey ? `${rawKey}_${Date.now().toString(36).substring(4)}` : `col_${Date.now()}`;
                    const newCol: TableColumnConfig = {
                      key: colKey,
                      label: newColName.trim(),
                      type: 'text',
                    };
                    const updated = [...tableColumns, newCol];
                    onUpdateComponent({ ...selectedComponent, columns: updated });
                    setNewColName('');
                    setEditingColModal({ column: newCol, index: updated.length - 1 });
                  }}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Table Footer Aggregates Builder */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5 text-indigo-600" /> Footer Aggregates ({selectedComponent.aggregates?.length || 0})
                </h3>
              </div>

              <div className="space-y-2">
                {(selectedComponent.aggregates || []).map((agg, aIdx) => (
                  <div key={agg.id || aIdx} className="p-2.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-xs transition-all hover:border-indigo-200">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{agg.label}</span>
                        <span className="text-[9px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold uppercase">
                          {agg.operation}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Column: {agg.targetColumnKey || agg.columnKey || 'all'} • {agg.displayType || agg.format || 'auto'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {aIdx > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const aggs = [...(selectedComponent.aggregates || [])];
                            const temp = aggs[aIdx - 1];
                            aggs[aIdx - 1] = aggs[aIdx];
                            aggs[aIdx] = temp;
                            onUpdateComponent({ ...selectedComponent, aggregates: aggs });
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {aIdx < (selectedComponent.aggregates?.length || 0) - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const aggs = [...(selectedComponent.aggregates || [])];
                            const temp = aggs[aIdx + 1];
                            aggs[aIdx + 1] = aggs[aIdx];
                            aggs[aIdx] = temp;
                            onUpdateComponent({ ...selectedComponent, aggregates: aggs });
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingAggregateModal({ aggregate: agg, index: aIdx })}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                        title="Configure Aggregate Settings"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const dupAgg: TableAggregateConfig = {
                            ...agg,
                            id: `agg-${Date.now()}`,
                            label: `${agg.label} (Copy)`,
                          };
                          const updated = [...(selectedComponent.aggregates || []), dupAgg];
                          onUpdateComponent({ ...selectedComponent, aggregates: updated });
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                        title="Duplicate Aggregate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (selectedComponent.aggregates || []).filter((_, i) => i !== aIdx);
                          onUpdateComponent({ ...selectedComponent, aggregates: updated });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        title="Delete Aggregate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {tableColumns.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const firstNumCol = tableColumns.find((c) => c.type === 'number' || c.type === 'currency' || c.type === 'calculated') || tableColumns[0];
                    const newAgg: TableAggregateConfig = {
                      id: `agg-${Date.now()}`,
                      label: 'Grand Total',
                      targetColumnKey: firstNumCol.key,
                      columnKey: firstNumCol.key,
                      operation: 'SUM',
                      displayType: firstNumCol.type === 'currency' ? 'currency' : 'number',
                      format: firstNumCol.type === 'currency' ? 'currency' : 'number',
                      alignment: 'right',
                      emphasis: 'strong',
                      showLabel: true,
                    };
                    setEditingAggregateModal({ aggregate: newAgg, index: (selectedComponent.aggregates || []).length });
                  }}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Footer Summary
                </button>
              )}
            </div>
          </div>
        )}

        {/* Signature Role & Properties */}
        {selectedComponent.type === 'signature' && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase">Signature Configuration</h3>
              <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 uppercase">
                Required Role
              </span>
            </div>

            {/* Signature Role Picker (Required) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                SIGNATURE ROLE <span className="text-rose-600 font-extrabold">*</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateComponent({
                      ...selectedComponent,
                      signatureConfig: {
                        ...selectedComponent.signatureConfig,
                        signatureRole: 'Sender',
                      },
                    })
                  }
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    selectedComponent.signatureConfig?.signatureRole === 'Sender'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <span>Sender Signature</span>
                  <span className="text-[9px] opacity-80 font-medium">Report Creator</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateComponent({
                      ...selectedComponent,
                      signatureConfig: {
                        ...selectedComponent.signatureConfig,
                        signatureRole: 'Receiver',
                      },
                    })
                  }
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    selectedComponent.signatureConfig?.signatureRole === 'Receiver'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <span>Receiver Signature</span>
                  <span className="text-[9px] opacity-80 font-medium">Workflow Reviewer</span>
                </button>
              </div>

            {!selectedComponent.signatureConfig?.signatureRole && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-700 flex items-start gap-1.5 mt-1">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>Choose whether this signature belongs to the report Sender or Receiver.</span>
                </div>
              )}
            </div>

            {/* Assignment standard (stored with the immutable template snapshot). */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Required Role</label>
                <select
                  value={selectedComponent.signatureConfig?.requiredRole || ''}
                  onChange={(e) => onUpdateComponent({
                    ...selectedComponent,
                    signatureConfig: { ...selectedComponent.signatureConfig, requiredRole: e.target.value.trim() || undefined },
                  })}
                  disabled={!isDraft}
                  className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">No role restriction defined by template</option>
                  {selectedComponent.signatureConfig?.requiredRole && !signatureRoles.some((role) => role.key === selectedComponent.signatureConfig?.requiredRole) && (
                    <option value={selectedComponent.signatureConfig.requiredRole}>Existing role: {selectedComponent.signatureConfig.requiredRole}</option>
                  )}
                  {signatureRoles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Stored as the canonical active role key; the field label remains display-only.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Assignment Policy</label>
                <select
                  value={selectedComponent.signatureConfig?.assignmentPolicy || 'fixed'}
                  onChange={(e) => onUpdateComponent({
                    ...selectedComponent,
                    signatureConfig: { ...selectedComponent.signatureConfig, assignmentPolicy: e.target.value as any },
                  })}
                  disabled={!isDraft}
                  className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="fixed">Fixed by Template</option>
                  <option value="default_override_allowed">Default — Report Creator Can Override</option>
                  <option value="report_creator_required">Report Creator Must Configure</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {selectedComponent.signatureConfig?.assignmentPolicy === 'report_creator_required'
                    ? 'The report creator must configure this field before completing the report.'
                    : selectedComponent.signatureConfig?.assignmentPolicy === 'default_override_allowed'
                      ? 'This configuration is used by default and may be changed for an individual report.'
                      : 'This assignment cannot be changed when creating a report.'}
                </p>
              </div>
            </div>

            {/* Custom Label */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Display Label</label>
              <input
                type="text"
                placeholder={selectedComponent.signatureConfig?.signatureRole === 'Sender' ? 'Prepared By' : 'Approved By'}
                value={selectedComponent.signatureConfig?.label || selectedComponent.label || ''}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    label: e.target.value,
                    signatureConfig: { ...selectedComponent.signatureConfig, label: e.target.value },
                  })
                }
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Custom Confirmation Statement */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Confirmation Statement</label>
              <textarea
                rows={2}
                placeholder="Custom confirmation text (optional)..."
                value={selectedComponent.signatureConfig?.confirmationStatement || ''}
                onChange={(e) =>
                  onUpdateComponent({
                    ...selectedComponent,
                    signatureConfig: {
                      ...selectedComponent.signatureConfig,
                      confirmationStatement: e.target.value,
                    },
                  })
                }
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Options List for Select & Radio */}
        {hasOptions && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase">Selection Options</h3>
            <div className="space-y-1.5">
              {optionsList.map((opt, idx) => (
                <div key={idx} className="p-2 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{opt.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedOpts = optionsList.filter((_, i) => i !== idx);
                      onUpdateComponent({ ...selectedComponent, options: updatedOpts });
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={newOptionInput}
                onChange={(e) => setNewOptionInput(e.target.value)}
                placeholder="Add option..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newOptionInput.trim()) return;
                  const newOpt: ComponentOption = { label: newOptionInput, value: newOptionInput };
                  onUpdateComponent({ ...selectedComponent, options: [...optionsList, newOpt] });
                  setNewOptionInput('');
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Delete Component Action */}
        <div className="pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => onDeleteComponent(selectedComponent.id)}
            disabled={!isDraft}
            className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Delete Component
          </button>
        </div>
      </div>

      {/* Table Column Modal */}
      {editingColModal && selectedComponent.type === 'table' && (
        <TableColumnModal
          column={editingColModal.column}
          allColumns={tableColumns}
          isOpen={Boolean(editingColModal)}
          onClose={() => setEditingColModal(null)}
          onSave={(updatedCol) => {
            const updated = [...tableColumns];
            updated[editingColModal.index] = updatedCol;
            onUpdateComponent({ ...selectedComponent, columns: updated });
            setEditingColModal(null);
          }}
        />
      )}

      {/* Table Aggregate Modal */}
      {editingAggregateModal && selectedComponent.type === 'table' && (
        <TableAggregateModal
          aggregate={editingAggregateModal.aggregate}
          columns={tableColumns}
          onSave={(updatedAgg) => {
            const currentAggs = [...(selectedComponent.aggregates || [])];
            if (editingAggregateModal.index < currentAggs.length) {
              currentAggs[editingAggregateModal.index] = updatedAgg;
            } else {
              currentAggs.push(updatedAgg);
            }
            onUpdateComponent({
              ...selectedComponent,
              showFooter: true,
              aggregates: currentAggs,
            });
            setEditingAggregateModal(null);
          }}
          onClose={() => setEditingAggregateModal(null)}
        />
      )}
    </aside>
  );
};
