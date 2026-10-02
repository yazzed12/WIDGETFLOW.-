import type { WidgetTemplate, ReportTemplateField, TemplateComponent } from '../../types';
import { getReportBusinessFieldKey } from '../../shared/signatureResolver';
import { validateTemplateValues } from './validationHelper';

export interface TemplateTestRunField {
  key: string;
  label: string;
  type: string;
}

const NOT_SIMULATED_TYPES = new Set(['file', 'signature']);

export function getTemplateTestRunFields(template: WidgetTemplate): TemplateTestRunField[] {
  const fields = (Array.isArray(template.components) && template.components.length > 0
    ? template.components
    : template.fields || []) as Array<ReportTemplateField | TemplateComponent>;

  return fields.flatMap((field) => {
    const key = getReportBusinessFieldKey(field);
    if (!key || NOT_SIMULATED_TYPES.has(field.type)) return [];
    return [{ key, label: field.label || key, type: field.type }];
  });
}

/** Reuses the report-fill validator, excluding actions unavailable in a local simulation. */
export function validateTemplateTestRun(template: WidgetTemplate, values: Record<string, unknown>): Record<string, string> {
  const fields = (Array.isArray(template.components) && template.components.length > 0
    ? template.components
    : template.fields || []) as Array<ReportTemplateField | TemplateComponent>;
  const testableFields = fields.filter((field) => !NOT_SIMULATED_TYPES.has(field.type));
  return validateTemplateValues({ components: testableFields as TemplateComponent[] }, values);
}

export function getNotSimulatedTemplateFields(template: WidgetTemplate): TemplateTestRunField[] {
  const fields = (Array.isArray(template.components) && template.components.length > 0
    ? template.components
    : template.fields || []) as Array<ReportTemplateField | TemplateComponent>;

  return fields.flatMap((field) => {
    const key = getReportBusinessFieldKey(field);
    if (!key || !NOT_SIMULATED_TYPES.has(field.type)) return [];
    return [{ key, label: field.label || key, type: field.type }];
  });
}
