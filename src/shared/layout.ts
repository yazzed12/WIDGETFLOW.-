import type { ReportTemplateField, TemplateComponent } from '../types';

export const MIN_LAYOUT_WIDTH_PERCENT = 20;
export const MAX_LAYOUT_WIDTH_PERCENT = 100;

/**
 * The minimum width is intentionally semantic rather than universal. These
 * values protect controls that become unusable when narrowed while keeping
 * simple fields compact. Legacy widths are still rendered as-is until the
 * user edits them (see getLayoutWidthPercent).
 */
export function getMinimumLayoutWidthPercent(component?: Pick<TemplateComponent, 'type'> | null): number {
  switch (component?.type) {
    case 'table':
      return 60;
    case 'repeating_group':
      return 50;
    case 'signature':
      return 40;
    case 'kpi':
      return 30;
    case 'paragraph':
    case 'info_box':
      return 30;
    case 'text':
    case 'textarea':
    case 'number':
    case 'currency':
    case 'percentage':
    case 'date':
    case 'datetime':
    case 'select':
    case 'radio':
    case 'checkbox':
    case 'rating':
    case 'file':
      return 25;
    default:
      return MIN_LAYOUT_WIDTH_PERCENT;
  }
}

export function clampLayoutWidthPercent(value: number): number {
  if (!Number.isFinite(value)) return MAX_LAYOUT_WIDTH_PERCENT;
  return Math.min(MAX_LAYOUT_WIDTH_PERCENT, Math.max(MIN_LAYOUT_WIDTH_PERCENT, Math.round(value)));
}

export function clampComponentLayoutWidthPercent(
  component: Pick<TemplateComponent, 'type'> | null | undefined,
  value: number,
): number {
  if (!Number.isFinite(value)) return MAX_LAYOUT_WIDTH_PERCENT;
  return Math.min(MAX_LAYOUT_WIDTH_PERCENT, Math.max(getMinimumLayoutWidthPercent(component), Math.round(value)));
}

export function legacyLayoutWidthToPercent(width?: string): number {
  switch (width) {
    case 'half':
      return 50;
    case 'third':
      return 33;
    case 'full':
    default:
      return 100;
  }
}

export function getLayoutWidthPercent(component: TemplateComponent | ReportTemplateField | any): number {
  const explicit = component?.layout?.widthPercent ?? component?.layoutWidthPercent;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) return clampLayoutWidthPercent(explicit);
  return legacyLayoutWidthToPercent(component?.layoutWidth || component?.layout?.width);
}

export function withLayoutWidthPercent(component: TemplateComponent, value: number): TemplateComponent {
  const widthPercent = clampComponentLayoutWidthPercent(component, value);
  return {
    ...component,
    layout: {
      ...(component.layout || {}),
      widthPercent,
    },
  };
}
