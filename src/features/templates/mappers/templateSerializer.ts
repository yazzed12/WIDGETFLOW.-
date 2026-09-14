import type { TemplateComponent, TemplateSection, WidgetTemplate } from '../../../types';

export interface TemplateDraftPayload {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  tags: string[];
  sections: TemplateSection[];
  rules: unknown[];
  calculations: unknown[];
  theme: unknown;
  headerConfig: unknown;
  footerConfig: unknown;
}

export function serializeTemplateDraft(template: WidgetTemplate): TemplateDraftPayload {
  const sections = template.dynamicSections ?? (template.sections ?? ['General Information']).map((title, order) => ({
    id: `section-${order}`,
    title,
    order,
    components: (template.components ?? template.fields ?? []).filter((component: any) => (component.section ?? title) === title),
  }));
  let globalOrder = 0;
  return {
    id: template.id && !template.id.startsWith('tpl-') ? template.id : undefined,
    name: template.name,
    description: template.description ?? '',
    categoryId: template.categoryId,
    tags: template.tags ?? [],
    sections: sections.map((section) => ({
      ...section,
      components: section.components.map((component) => ({
        ...component,
        key: component.key || component.id,
        order: globalOrder++,
      })) as TemplateComponent[],
    })),
    rules: template.workflow?.rules ?? [],
    calculations: template.workflow?.calculations ?? [],
    theme: template.theme ?? {},
    headerConfig: template.headerConfig ?? {},
    footerConfig: template.footerConfig ?? {},
  };
}

export function deserializeTemplateRow(row: any, sections: any[] = [], fields: any[] = [], tags: any[] = []): WidgetTemplate {
  const sectionRows = sections.filter((s) => s.template_id === row.id).sort((a, b) => a.display_order - b.display_order);
  const fieldRows = fields.filter((f) => f.template_id === row.id).sort((a, b) => a.display_order - b.display_order);
  const mappedSections: TemplateSection[] = sectionRows.map((section) => ({
    id: section.id,
    title: section.name,
    description: section.description ?? undefined,
    order: section.display_order,
    components: fieldRows.filter((field) => field.section_id === section.id).map((field) => ({
      id: field.id, key: field.field_key, label: field.label, type: field.field_type,
      required: field.is_required, placeholder: field.placeholder ?? undefined,
      description: field.description ?? undefined, defaultValue: field.default_value,
      layoutWidth: field.layout_width, validation: field.validation_rules,
      options: field.options, section: section.name, order: field.display_order,
      ...(field.configuration ?? {}),
    } as TemplateComponent)),
  }));
  const components = mappedSections.flatMap((section) => section.components);
  const statusMap: Record<string, WidgetTemplate['status']> = {
    draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved', rejected: 'Rejected', archived: 'Archived', superseded: 'Superseded',
  };
  return {
    id: row.id, templateDisplayId: row.template_display_id ?? undefined, name: row.name, description: row.description ?? '', categoryId: row.category_id,
    createdById: row.created_by_user_id, createdByName: row.creator_name, createdByRole: row.creator_role_name,
    createdAt: row.created_at, updatedAt: row.updated_at, status: statusMap[row.status] ?? 'Draft',
    tags: tags.filter((tag) => tag.template_id === row.id).map((tag) => tag.tag), version: row.version_label,
    creationMethod: row.creation_method, dynamicSections: mappedSections, sections: mappedSections.map((s) => s.title),
    components, fields: components as any, requestedApprovalFromUserId: row.assigned_reviewer_user_id ?? row.routing_specific_user_id,
    requestedApprovalFromName: row.assigned_reviewer_name_snapshot, rejectionReason: row.rejection_reason,
    returnReason: row.return_reason ?? undefined, returnedAt: row.returned_at ?? undefined,
    theme: row.theme, headerConfig: row.header_config, footerConfig: row.footer_config,
  };
}
