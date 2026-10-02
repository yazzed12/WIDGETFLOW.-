import React from 'react';
import type { TemplateComponent, BuilderValidationIssue, TemplateTheme } from '../../types';
import { TOOLBOX_ITEMS } from './BuilderToolbox';
import { GripVertical, Copy, Trash2, Tag, AlertCircle, DollarSign, Percent, Calendar, Paperclip, CheckCircle } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { useDndContext } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getLayoutWidthPercent, clampComponentLayoutWidthPercent } from '../../shared/layout';
import { resolveElementAppearance } from '../../shared/themeResolver';
import { resolveComponentStyle } from '../../shared/themeResolver';
import { resolveAssetUrl } from '../../shared/display-tools/displayUtils';
import { AuthenticatedAssetImage } from '../common/AuthenticatedAssetImage';

interface BuilderComponentProps {
  component: TemplateComponent;
  isSelected: boolean;
  validationIssue?: BuilderValidationIssue;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onResize: (widthPercent: number) => void;
  canResize?: boolean;
  sectionId: string;
  componentIndex: number;
  templateTheme?: TemplateTheme;
}

const BuilderImagePreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const imageConfig = component.imageConfig || {};
  const src = resolveAssetUrl(imageConfig.assetUrl || component.assetUrl, imageConfig.assetId || component.assetId);
  const [failedSource, setFailedSource] = React.useState<string | null>(null);
  const handleImageError = React.useCallback(() => {
    setFailedSource(src);
  }, [src]);
  const failed = Boolean(src && failedSource === src);

  if (!src || failed) {
    return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-500">{failed ? "We couldn't load this image." : 'Upload an image to preview it here.'}</div>;
  }

  return <AuthenticatedAssetImage src={src} alt={imageConfig.altText || component.altText || component.label || 'Template image'} onAssetError={handleImageError} onError={handleImageError} className="max-h-40 max-w-full rounded-lg border border-slate-200 bg-white object-contain" />;
};

export const BuilderComponent: React.FC<BuilderComponentProps> = ({
  component,
  isSelected,
  validationIssue,
  onSelect,
  onDuplicate,
  onDelete,
  onResize,
  canResize = true,
  sectionId,
  componentIndex,
  templateTheme,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: component.id,
    data: { component, isComponent: true, sectionId, componentIndex },
  });
  const { active, over } = useDndContext();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const widthPercent = getLayoutWidthPercent(component);
  const [draftWidthPercent, setDraftWidthPercent] = React.useState(widthPercent);
  const draftWidthRef = React.useRef(widthPercent);
  const [isResizing, setIsResizing] = React.useState(false);
  const resizeStart = React.useRef<{ x: number; width: number; container: number; direction: 'left' | 'right' } | null>(null);

  React.useEffect(() => {
    if (!isResizing) {
      draftWidthRef.current = widthPercent;
      setDraftWidthPercent(widthPercent);
    }
  }, [widthPercent, isResizing]);

  const beginResize = (event: React.PointerEvent<HTMLButtonElement>, direction: 'left' | 'right') => {
    if (!isSelected || !canResize) return;
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget.closest('[data-builder-component]') as HTMLElement | null;
    const container = element?.parentElement?.getBoundingClientRect().width || element?.getBoundingClientRect().width || 1;
    resizeStart.current = { x: event.clientX, width: widthPercent, container, direction };
    draftWidthRef.current = widthPercent;
    setDraftWidthPercent(widthPercent);
    setIsResizing(true);
  };

  React.useEffect(() => {
    if (!isResizing) return;
    const handleMove = (event: PointerEvent) => {
      const start = resizeStart.current;
      if (!start) return;
      const delta = ((event.clientX - start.x) / start.container) * 100 * (start.direction === 'left' ? -1 : 1);
      const nextWidth = clampComponentLayoutWidthPercent(component, start.width + delta);
      draftWidthRef.current = nextWidth;
      setDraftWidthPercent(nextWidth);
    };
    const handleUp = () => {
      const finalWidth = clampComponentLayoutWidthPercent(component, draftWidthRef.current);
      setIsResizing(false);
      resizeStart.current = null;
      if (finalWidth !== widthPercent) onResize(finalWidth);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [component, isResizing, onResize, widthPercent]);

  const insertionSide = React.useMemo(() => {
    if (!isOver || !active || !over || active.id === component.id) return null;
    const activeRect = active.rect.current.translated || active.rect.current.initial;
    const overRect = over.rect;
    if (!activeRect || !overRect) return null;
    const activeCenterX = activeRect.left + activeRect.width / 2;
    const activeCenterY = activeRect.top + activeRect.height / 2;
    const overCenterX = overRect.left + overRect.width / 2;
    const overCenterY = overRect.top + overRect.height / 2;
    const sameRow = Math.abs(activeCenterY - overCenterY) <= Math.max(activeRect.height, overRect.height) * 0.7;
    return (sameRow ? activeCenterX < overCenterX : activeCenterY < overCenterY) ? 'before' : 'after';
  }, [active, component.id, isOver, over]);
  const itemDef = TOOLBOX_ITEMS.find((t) => t.type === component.type);
  const appearance = resolveElementAppearance(component);
  const textStyle = component.type === 'heading' || component.type === 'paragraph'
    ? resolveComponentStyle(component, templateTheme)
    : null;

  const isContent = component.type === 'heading' || component.type === 'paragraph';

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      data-builder-component="true"
      className="wf-layout-item relative group transition-all duration-150 cursor-pointer"
      style={{ '--wf-layout-width': `${draftWidthPercent}%`, ...style } as React.CSSProperties}
    >
      <div
        id={component.id}
        className={`p-3.5 rounded-xl border bg-white transition-all shadow-2xs relative ${
          isDragging ? 'opacity-30' : ''
        } ${
          validationIssue
            ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/10 shadow-md z-10'
            : isSelected
            ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md z-10'
            : 'border-slate-200 hover:border-indigo-300 hover:shadow-xs'
        }`}
        style={{
          ...(appearance.backgroundColor ? { backgroundColor: appearance.backgroundColor } : {}),
          ...(appearance.borderColor ? { borderColor: appearance.borderColor } : {}),
          ...(appearance.borderWidth !== undefined ? { borderWidth: appearance.borderWidth } : {}),
          ...(appearance.borderStyle ? { borderStyle: appearance.borderStyle } : {}),
          ...(appearance.borderRadius !== undefined ? { borderRadius: appearance.borderRadius } : {}),
          ...(appearance.padding !== undefined ? { padding: appearance.padding } : {}),
          ...(appearance.textAlign ? { textAlign: appearance.textAlign } : {}),
        }}
      >
        {insertionSide && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute left-0 right-0 z-30 h-1 rounded-full bg-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.16)] ${insertionSide === 'before' ? '-top-2' : '-bottom-2'}`}
          />
        )}
        {isSelected && canResize && !validationIssue && (
          <>
            <button type="button" aria-label="Resize element width from left" onPointerDown={(event) => beginResize(event, 'left')} className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 h-8 w-2 rounded-full bg-indigo-600/80 opacity-70 hover:opacity-100 cursor-ew-resize touch-none select-none" />
            <button type="button" aria-label="Resize element width from right" onPointerDown={(event) => beginResize(event, 'right')} className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-20 h-8 w-2 rounded-full bg-indigo-600/80 opacity-70 hover:opacity-100 cursor-ew-resize touch-none select-none" />
            {isResizing && (
              <span className="absolute -top-7 right-0 z-20 rounded-md bg-indigo-700 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm" aria-live="polite">{Math.round(draftWidthPercent)}%</span>
            )}
          </>
        )}
        {/* Header Bar: Drag Handle, Icon, Label & Key */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="p-1 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing rounded"
            >
              <GripVertical className="w-4 h-4" />
            </button>

            <div className="p-1 bg-slate-100 rounded text-slate-600 shrink-0">
              {itemDef?.icon || <Tag className="w-3.5 h-3.5" />}
            </div>

            <span className="text-xs font-bold text-slate-900 truncate">
              {component.label || component.key}
            </span>

            {component.required && (
              <span className="text-rose-500 text-xs font-bold shrink-0">*</span>
            )}
          </div>

          {/* Right Info Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {validationIssue && (
              <span className="font-bold text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1 shrink-0">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                <span>Needs attention</span>
              </span>
            )}

            {!isContent && (
              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-semibold flex items-center gap-1">
                <Tag className="w-2.5 h-2.5 text-slate-400" />
                {component.key}
              </span>
            )}

          </div>
        </div>

        {/* Description Preview */}
        {component.description && (
          <p className="text-[11px] text-slate-500 mb-2 pl-7 leading-tight">{component.description}</p>
        )}

        {/* Visual Input Field Preview (Non-interactive representation) */}
        <div className="pl-7 pt-1">
          {(() => {
            switch (component.type) {
              case 'heading':
                return (
                  <div className="py-1 border-b border-slate-200" style={textStyle ? { fontFamily: textStyle.fontFamily, fontSize: textStyle.fontSize, fontWeight: textStyle.fontWeight, color: textStyle.color, textAlign: textStyle.textAlign, lineHeight: textStyle.lineHeight, letterSpacing: textStyle.letterSpacing } : undefined}>
                    <span className="tracking-tight">{component.label}</span>
                  </div>
                );

              case 'paragraph':
                return (
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-950 font-medium" style={textStyle ? { fontFamily: textStyle.fontFamily, fontSize: textStyle.fontSize, fontWeight: textStyle.fontWeight, color: textStyle.color, textAlign: textStyle.textAlign, lineHeight: textStyle.lineHeight, letterSpacing: textStyle.letterSpacing } : undefined}>
                    {component.label}
                  </div>
                );

              case 'image':
                return <BuilderImagePreview component={component} />;

              case 'textarea':
                return (
                  <div className="w-full h-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-400 italic">
                    {component.placeholder || 'Text area input preview...'}
                  </div>
                );

              case 'select':
              case 'radio':
                const options = component.options || ['Option 1', 'Option 2'];
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((opt: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-slate-700"
                      >
                        {typeof opt === 'string' ? opt : opt.label}
                      </span>
                    ))}
                  </div>
                );

              case 'checkbox':
                return (
                  <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>{component.label}</span>
                  </div>
                );

              case 'currency':
                return (
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{component.placeholder || '0.00'}</span>
                  </div>
                );

              case 'percentage':
                return (
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700">
                    <span>{component.placeholder || '0'}</span>
                    <Percent className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                );

              case 'date':
              case 'datetime':
                return (
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>YYYY-MM-DD</span>
                  </div>
                );

              case 'file':
                return (
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                    <Paperclip className="w-3.5 h-3.5 text-rose-500" />
                    <span>Attach document preview</span>
                  </div>
                );

              case 'signature':
                const sigRole = component.signatureConfig?.signatureRole;
                return (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-1">
                    <span className="text-xs font-bold text-slate-700 block">
                      {sigRole ? `${sigRole} Signature Area` : 'Signature Component'}
                    </span>
                    <p className="text-[11px] text-slate-500 italic">
                      {sigRole === 'Sender'
                        ? '[ Sender signature will appear here when report is signed and sent ]'
                        : sigRole === 'Receiver'
                        ? '[ Receiver signature will appear here when reviewer signs ]'
                        : '[ Choose Signature Role (Sender or Receiver) in Properties ]'}
                    </p>
                  </div>
                );

              case 'text':
              default:
                return (
                  <div className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-400 italic">
                    {component.placeholder || 'Text field preview...'}
                  </div>
                );
            }
          })()}
        </div>

        {/* Inline Component Error Message */}
        {validationIssue && (
          <div className="mt-2.5 ml-7 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{validationIssue.message}</span>
          </div>
        )}

        {/* Selected Component Quick Action Toolbar */}
        {isSelected && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900 text-white p-1 rounded-lg shadow-lg z-20 animate-fade-in">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate Component"
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete Component"
              className="p-1 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
