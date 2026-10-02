import React from 'react';
import type { WidgetTemplate, DynamicTemplate, ReportTemplateField, TemplateComponent, TemplateSection, ReportSignatureAssignment, ReportAssignment, ReportSignatureConfiguration } from '../../types';
import { TemplateComponentRenderer } from './TemplateComponentRenderer';
import { Layers } from 'lucide-react';
import { getReportBusinessFieldKey } from '../../shared/signatureResolver';
import { getLayoutWidthPercent } from '../../shared/layout';
import { resolveDocumentSpacing, resolveSectionStyle, resolveEffectiveTheme } from '../../shared/themeResolver';

interface DynamicTemplateRendererProps {
  template: WidgetTemplate | DynamicTemplate;
  values: Record<string, any>;
  mode: 'edit' | 'readOnly';
  onChange?: (newValues: Record<string, any>) => void;
  errors?: Record<string, string>;
  activeSignature?: any;
  activeSignatures?: any[];
  signatureHistory?: any[];
  signatureAssignments?: ReportSignatureAssignment[];
  assignments?: ReportAssignment[];
  signatureConfigurations?: ReportSignatureConfiguration[];
  currentUser?: any;
  reportId?: string;
  ensureReportId?: () => Promise<string>;
  /** Prevent report-context side effects for local Studio fill simulations. */
  simulationMode?: boolean;
  componentAnchorPrefix?: string;
}

export const DynamicTemplateRenderer: React.FC<DynamicTemplateRendererProps> = ({
  template,
  values = {},
  mode,
  onChange,
  errors = {},
  activeSignature,
  activeSignatures,
  signatureHistory,
  signatureAssignments,
  assignments,
  signatureConfigurations,
  currentUser,
  reportId,
  ensureReportId,
  simulationMode = false,
  componentAnchorPrefix,
}) => {
  // Structured snapshot sections are authoritative for order and layout. Older
  // snapshots may only have a flat fields/components array, so retain that
  // compatibility path and group by the persisted section name.
  const candidateComponents = (template as any).components;
  const candidateFields = (template as any).fields;
  const rawFields: Array<ReportTemplateField | TemplateComponent> =
    (Array.isArray(candidateComponents) && candidateComponents.length > 0
      ? candidateComponents
      : Array.isArray(candidateFields) ? candidateFields : []);
  const structuredSections = [
    (template as any).sections,
    (template as any).dynamicSections,
  ].find((sections) => Array.isArray(sections) && sections.some((section: any) => Array.isArray(section?.components)));
  const sectionMap = new Map<string, Array<ReportTemplateField | TemplateComponent>>();

  if (Array.isArray(structuredSections)) {
    structuredSections.forEach((section: any, index: number) => {
      if (!Array.isArray(section?.components)) return;
      const title = typeof section === 'string'
        ? section
        : section.title || section.name || section.id || `Section ${index + 1}`;
      sectionMap.set(String(title), section.components);
    });
  }

  if (sectionMap.size === 0) {
    const explicitSections: string[] = (template as any).sections && Array.isArray((template as any).sections)
      ? (template as any).sections.map((section: any) => typeof section === 'string' ? section : section?.title || section?.name || section?.id).filter(Boolean)
      : (template as any).dynamicSections?.map((s: TemplateSection) => s.title) || [];
    explicitSections.forEach((secName) => sectionMap.set(secName, []));
    rawFields.forEach((f) => {
      const secName = f.section || 'General Information';
      if (!sectionMap.has(secName)) sectionMap.set(secName, []);
      sectionMap.get(secName)!.push(f);
    });
  }

  const handleComponentChange = (key: string, newVal: any) => {
    if (onChange) {
      onChange({
        ...values,
        [key]: newVal,
      });
    }
  };

  const sectionsToRender = Array.from(sectionMap.entries()).filter(([_, comps]) => comps.length > 0);
  const spacing = resolveDocumentSpacing((template as any).theme);
  const sectionStyle = resolveSectionStyle((template as any).theme);
  const effectiveTheme = resolveEffectiveTheme((template as any).theme);

  if (sectionsToRender.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-xs">
        No sections or components found in template.
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-fade-in" style={{ backgroundColor: effectiveTheme.bgColor, padding: spacing.pagePadding, rowGap: spacing.sectionGap }}>
      {sectionsToRender.map(([sectionTitle, comps], sIdx) => (
        <div
          key={sectionTitle}
          className={`rounded-2xl border transition-all flex flex-col ${
            mode === 'readOnly'
              ? 'bg-slate-50/50 border-slate-200/80'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
          style={{ backgroundColor: sectionStyle.backgroundColor, borderColor: sectionStyle.borderColor, color: sectionStyle.color, padding: spacing.pagePadding, gap: spacing.componentGap }}
        >
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${effectiveTheme.primaryColor}18`, color: effectiveTheme.primaryColor }}>
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: effectiveTheme.primaryColor }}>{sectionTitle}</h3>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: effectiveTheme.secondaryColor, backgroundColor: `${effectiveTheme.secondaryColor}12` }}>
              Section {sIdx + 1} of {sectionsToRender.length}
            </span>
          </div>

          {/* Section Components Grid */}
          <div className="wf-layout-grid" style={{ gap: spacing.componentGap }}>
            {comps.map((comp) => {
              const fieldKey = getReportBusinessFieldKey(comp) || '';
              const isNonInteractiveContent = ['heading', 'paragraph', 'image', 'divider', 'spacer', 'info_box'].includes(comp.type);
              if (mode === 'edit' && !fieldKey && !(simulationMode && isNonInteractiveContent)) {
                return <div key={comp.id} className="col-span-12 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">This field is missing a business key and cannot accept Report data.</div>;
              }
              const val = fieldKey ? values[fieldKey] : undefined;
              const errorMsg = fieldKey ? errors[fieldKey] : undefined;

              const normalizedComponent = fieldKey === comp.key ? comp : { ...comp, key: fieldKey } as any;
              return (
                <div key={comp.id || fieldKey} id={componentAnchorPrefix ? `${componentAnchorPrefix}-${comp.id || fieldKey}` : undefined} className="wf-layout-item" style={{ '--wf-layout-width': `${getLayoutWidthPercent(normalizedComponent)}%` } as React.CSSProperties}>
                  <TemplateComponentRenderer
                  component={normalizedComponent}
                  value={val}
                  mode={mode}
                  onChange={handleComponentChange}
                  error={errorMsg}
                  activeSignature={activeSignature}
                  activeSignatures={activeSignatures}
                  signatureHistory={signatureHistory}
                  signatureAssignments={signatureAssignments}
                  assignments={assignments}
                  signatureConfigurations={signatureConfigurations}
                  currentUser={currentUser}
                  reportId={reportId}
                  ensureReportId={ensureReportId}
                  simulationMode={simulationMode}
                  fieldDomId={simulationMode && fieldKey ? `test-run-field-${fieldKey}` : undefined}
                  theme={(template as any).theme}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
