import type {
  TemplateComponent,
  ReportSignatureRecord,
  ReportSignatureAssignment,
  ReportAssignment,
} from '../types/index.js';
import type { ReportSignatureConfiguration } from '../types/index.js';

export function resolveReportSignatureForComponent({
  component,
  activeSignatures = [],
  signatureHistory = [],
  activeSignature = null,
  signatureAssignments = [],
}: {
  component: TemplateComponent;
  activeSignatures?: ReportSignatureRecord[];
  signatureHistory?: ReportSignatureRecord[];
  activeSignature?: ReportSignatureRecord | null;
  signatureAssignments?: ReportSignatureAssignment[];
}): ReportSignatureRecord | null {
  if (activeSignature) return activeSignature;

  const rawRole =
    component.signatureConfig?.signatureRole ||
    (component as any).signatureRole ||
    'Sender';

  const canonicalRole = String(rawRole).toLowerCase();

  let match = activeSignatures.find(
    (s) =>
      s.isActive !== false &&
      (
        (Boolean(s.componentId) && s.componentId === component.id) ||
        (Boolean(s.componentKey) && s.componentKey === component.key)
      )
  );

  if (match) return match;

  // Migration 039's immutable mapping is the canonical field-to-recipient
  // relationship. Use it when signature events do not carry component keys.
  if (signatureAssignments.length > 0) {
    const fieldKey = getReportBusinessFieldKey(component);
    const mappedAssignmentIds = new Set(
      signatureAssignments
        .filter((mapping) => fieldKey !== null && mapping.signatureFieldKey === fieldKey)
        .map((mapping) => mapping.reportAssignmentId)
    );
    const mappedMatches = activeSignatures.filter(
      (s) => s.isActive !== false && s.reportAssignmentId && mappedAssignmentIds.has(s.reportAssignmentId)
    );
    if (mappedMatches.length === 1) return mappedMatches[0];
  }

  // A role-only fallback is safe only when the report has exactly one
  // active signature for that role.  With multiple receiver assignments,
  // selecting the first record would display one recipient's signer in
  // another recipient's field.
  const activeRoleMatches = activeSignatures.filter(
    (s) =>
      s.isActive !== false &&
      String(s.signatureRole).toLowerCase() === canonicalRole
  );

  if (activeRoleMatches.length === 1) return activeRoleMatches[0];

  const historicalExactMatch = signatureHistory.find(
    (s) =>
      s.isActive !== false &&
      (
        (Boolean(s.componentId) && s.componentId === component.id) ||
        (Boolean(s.componentKey) && s.componentKey === component.key)
      )
  );

  if (historicalExactMatch) return historicalExactMatch;

  const historicalRoleMatches = signatureHistory.filter(
    (s) =>
      s.isActive !== false &&
      String(s.signatureRole).toLowerCase() === canonicalRole
  );

  return historicalRoleMatches.length === 1 ? historicalRoleMatches[0] : null;
}

/**
 * Report persistence identity:
 * business key only.
 * NEVER component.id.
 */
export function getReportBusinessFieldKey(component: any): string | null {
  const candidates = [
    component?.field_key,
    component?.key,
    component?.fieldKey,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === 'string' &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return null;
}

export interface ReportSignatureFieldDefinition {
  fieldKey: string;
  label: string;
  signatureRole: 'sender' | 'receiver';
  required: boolean;
  assignmentPolicy: 'fixed' | 'default_override_allowed' | 'report_creator_required';
  defaultRequiredRoleKey: string | null;
}

export interface EffectiveReportSignatureFieldDefinition extends ReportSignatureFieldDefinition {
  displayLabel: string;
  signerContext: 'sender' | 'receiver';
  requiredRoleKey: string | null;
  source: 'template' | 'report-override';
}

export function normalizeSignatureRoleKey(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isSignatureConfigurationComplete(
  field: EffectiveReportSignatureFieldDefinition,
  configuration: ReportSignatureConfigurationDraftLike | undefined,
  activeRoleKeys: Iterable<string>,
): boolean {
  const configured = configuration?.configured === true;
  const displayLabel = (configured ? configuration?.displayLabel : field.displayLabel || field.label)?.trim() || '';
  const signerContext = configured ? configuration?.signatureRole : field.signerContext;
  const requiredRoleKey = normalizeSignatureRoleKey(
    configured ? configuration?.requiredRoleKey : field.requiredRoleKey,
  );
  const activeKeys = new Set(Array.from(activeRoleKeys, normalizeSignatureRoleKey));

  if (!field.fieldKey.trim() || !displayLabel) return false;
  if (signerContext !== 'sender' && signerContext !== 'receiver') return false;
  if (field.assignmentPolicy === 'report_creator_required' && !configured) return false;
  if ((field.assignmentPolicy === 'report_creator_required' || requiredRoleKey) && (!requiredRoleKey || !activeKeys.has(requiredRoleKey))) return false;
  return true;
}

export type ReportSignatureConfigurationDraftLike = {
  configured: boolean;
  requiredRoleKey: string;
  displayLabel?: string;
  signatureRole?: 'sender' | 'receiver';
};

/** One canonical report signature definition for historical and current snapshots. */
export function resolveEffectiveReportSignatureFields(
  template: unknown,
  configurations: ReportSignatureConfiguration[] = [],
): EffectiveReportSignatureFieldDefinition[] {
  return collectReportSignatureFieldDefinitions(template).map((field) => {
    const override = configurations.find((item) => item.signatureFieldKey === field.fieldKey && item.isOverride !== false);
    const signerContext = override?.signatureRole === 'sender' ? 'sender' : override?.signatureRole === 'receiver' ? 'receiver' : field.signatureRole;
    const displayLabel = typeof override?.displayLabelOverride === 'string' && override.displayLabelOverride.trim()
      ? override.displayLabelOverride.trim()
      : field.label;
    return {
      ...field,
      label: displayLabel,
      displayLabel,
      signerContext,
      signatureRole: signerContext,
      requiredRoleKey: override?.requiredRoleKey ?? field.defaultRequiredRoleKey,
      source: override ? 'report-override' : 'template',
    };
  });
}

export interface ReportSignatureConfigurationDraft extends ReportSignatureConfigurationDraftLike {}

export function serializeReportSignatureConfiguration(
  field: ReportSignatureFieldDefinition,
  draft: ReportSignatureConfigurationDraft,
) {
  return {
    signatureFieldKey: field.fieldKey,
    signatureRole: draft.signatureRole ?? field.signatureRole,
    requiredRole: draft.configured ? draft.requiredRoleKey.trim() || null : null,
    displayLabel: draft.configured ? draft.displayLabel?.trim() || null : null,
    hasExplicitConfiguration: draft.configured,
  };
}

/**
 * Return one canonical definition per signature business field. Template
 * snapshots can expose the same component through several historical wrapper
 * collections, so dedupe by field_key/key (never by component.id).
 */
export function collectReportSignatureFieldDefinitions(value: any): ReportSignatureFieldDefinition[] {
  const output: ReportSignatureFieldDefinition[] = [];
  const seenKeys = new Set<string>();
  const seenObjects = new WeakSet<object>();

  const visit = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (typeof node !== 'object' || seenObjects.has(node)) return;
    seenObjects.add(node);

    const wrapperConfiguration = node.configuration;
    const configuration = node.signatureConfig
      ?? node.signature_config
      ?? wrapperConfiguration?.signatureConfig
      ?? wrapperConfiguration?.signature_config
      ?? (wrapperConfiguration && typeof wrapperConfiguration === 'object' ? wrapperConfiguration : {});
    const type = String(node.type ?? node.field_type ?? node.component_type ?? node.configuration?.type ?? node.configuration?.field_type ?? '').toLowerCase();
    if (type === 'signature') {
      const fieldKey = String(node.field_key ?? node.key ?? node.fieldKey ?? configuration.field_key ?? configuration.key ?? '').trim();
      if (fieldKey && !seenKeys.has(fieldKey)) {
        const rawRole = String(configuration.signatureRole ?? configuration.signature_role ?? node.signatureRole ?? node.signature_role ?? 'receiver').toLowerCase();
        const rawPolicy = String(configuration.assignmentPolicy ?? configuration.assignment_policy ?? node.assignmentPolicy ?? node.assignment_policy ?? 'fixed').toLowerCase();
        const assignmentPolicy = rawPolicy === 'default_override_allowed' || rawPolicy === 'report_creator_required'
          ? rawPolicy
          : 'fixed';
        output.push({
          fieldKey,
          label: String(configuration.label ?? node.label ?? node.title ?? fieldKey),
          signatureRole: rawRole === 'sender' ? 'sender' : 'receiver',
          required: Boolean(node.is_required ?? node.required ?? configuration.required),
          assignmentPolicy,
          defaultRequiredRoleKey: String(configuration.requiredRole ?? configuration.required_role_key ?? configuration.required_role ?? node.requiredRole ?? node.required_role_key ?? '').trim() || null,
        });
        seenKeys.add(fieldKey);
      }
    }

    Object.values(node).forEach(visit);
  };

  visit(value);
  return output;
}

/** Resolve the persisted recipient assignment for a receiver signature field. */
export function resolveReportAssignmentForComponent({
  component,
  signatureAssignments = [],
  assignments = [],
}: {
  component: TemplateComponent;
  signatureAssignments?: ReportSignatureAssignment[];
  assignments?: ReportAssignment[];
}): ReportAssignment | null {
  const fieldKey = getReportBusinessFieldKey(component);
  if (!fieldKey) return null;
  const mapping = signatureAssignments.find(
    (candidate) => candidate.signatureFieldKey === fieldKey
  );
  if (!mapping) return null;
  return assignments.find((assignment) => assignment.id === mapping.reportAssignmentId) || null;
}

function normalizeSnapshotField(field: any): any {
  if (!field || typeof field !== 'object') {
    return field;
  }

  const normalized: any = {
    ...field,
  };

  if (
    !normalized.key &&
    typeof field.field_key === 'string'
  ) {
    normalized.key = field.field_key;
  }

  if (
    !normalized.key &&
    typeof field.fieldKey === 'string'
  ) {
    normalized.key = field.fieldKey;
  }

  if (
    !normalized.type &&
    typeof field.field_type === 'string'
  ) {
    normalized.type = field.field_type;
  }

  if (
    !normalized.type &&
    typeof field.component_type === 'string'
  ) {
    normalized.type = field.component_type;
  }

  if (
    normalized.required === undefined &&
    field.is_required !== undefined
  ) {
    normalized.required = field.is_required;
  }

  if (
    normalized.defaultValue === undefined &&
    field.default_value !== undefined
  ) {
    normalized.defaultValue = field.default_value;
  }

  if (
    normalized.signatureConfig === undefined &&
    field.signature_config !== undefined
  ) {
    normalized.signatureConfig = field.signature_config;
  }

  // Some historical snapshots stored signature metadata directly inside the
  // configuration wrapper. Promote only the signature keys so every renderer
  // consumes one canonical shape without mutating the source snapshot.
  const wrapper = field.configuration ?? field.config;
  if (wrapper && typeof wrapper === 'object' && normalized.signatureConfig === undefined && (
    wrapper.signatureRole !== undefined || wrapper.signature_role !== undefined ||
    wrapper.requiredRole !== undefined || wrapper.required_role !== undefined ||
    wrapper.assignmentPolicy !== undefined || wrapper.assignment_policy !== undefined
  )) {
    normalized.signatureConfig = {
      signatureRole: wrapper.signatureRole ?? wrapper.signature_role,
      requiredRole: wrapper.requiredRole ?? wrapper.required_role ?? wrapper.required_role_key,
      assignmentPolicy: wrapper.assignmentPolicy ?? wrapper.assignment_policy,
      label: wrapper.label,
      required: wrapper.required,
    };
  }

  if (
    normalized.configuration === undefined &&
    field.config !== undefined
  ) {
    normalized.configuration = field.config;
  }

  // Template snapshots persist the original component JSON inside the
  // template_fields.configuration column. Promote image presentation data
  // from that historical wrapper so the shared renderer can consume the
  // canonical component shape without mutating the snapshot.
  const configuration = normalized.configuration;
  if (
    normalized.imageConfig === undefined &&
    configuration &&
    typeof configuration === 'object' &&
    configuration.imageConfig &&
    typeof configuration.imageConfig === 'object'
  ) {
    normalized.imageConfig = configuration.imageConfig;
  }

  if (
    normalized.assetUrl === undefined &&
    configuration &&
    typeof configuration === 'object' &&
    typeof configuration.assetUrl === 'string'
  ) {
    normalized.assetUrl = configuration.assetUrl;
  }

  if (
    normalized.assetId === undefined &&
    configuration &&
    typeof configuration === 'object' &&
    typeof configuration.assetId === 'string'
  ) {
    normalized.assetId = configuration.assetId;
  }

  return normalized;
}

function isRenderableTemplateNode(node: any): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const type = String(
    node.type ??
    node.field_type ??
    node.component_type ??
    ''
  ).toLowerCase();

  const hasIdentity =
    typeof node.key === 'string' ||
    typeof node.field_key === 'string' ||
    typeof node.fieldKey === 'string' ||
    typeof node.id === 'string';

  const hasPresentation =
    typeof node.label === 'string' ||
    typeof node.title === 'string' ||
    type.length > 0;

  return hasIdentity && hasPresentation;
}

function sectionTitle(
  section: any,
  index: number
): string {
  if (typeof section === 'string') {
    return section;
  }

  return String(
    section?.title ||
    section?.name ||
    section?.label ||
    section?.sectionTitle ||
    section?.section_name ||
    section?.id ||
    `Section ${index + 1}`
  );
}

function getSectionChildren(section: any): any[] {
  if (!section || typeof section !== 'object') {
    return [];
  }

  const candidates = [
    section.components,
    section.fields,
    section.children,
    section.items,
  ];

  for (const candidate of candidates) {
    if (
      Array.isArray(candidate) &&
      candidate.length > 0
    ) {
      return candidate;
    }
  }

  return [];
}

/**
 * Convert any historical report template snapshot into one stable
 * frontend shape.
 *
 * Important:
 * - historical snapshots are not mutated
 * - structured section order is preserved
 * - sections[].components and sections[].fields are both supported
 * - older nested/wrapped snapshot shapes are supported
 * - component.id is never promoted to a business field key
 */
export function normalizeReportTemplateSnapshot(snapshot: any): any {
  if (
    !snapshot ||
    typeof snapshot !== 'object'
  ) {
    return snapshot;
  }

  const discovered: any[] = [];
  const structuredSections: any[] = [];

  const seenObjects = new WeakSet<object>();

  const visit = (
    node: any,
    inheritedSection?: string
  ) => {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach((item) =>
        visit(item, inheritedSection)
      );
      return;
    }

    if (typeof node !== 'object') {
      return;
    }

    if (seenObjects.has(node)) {
      return;
    }

    seenObjects.add(node);

    const sectionArrays = [
      node.sections,
      node.dynamicSections,
    ];

    for (const sections of sectionArrays) {
      if (!Array.isArray(sections)) {
        continue;
      }

      sections.forEach(
        (rawSection: any, index: number) => {
          if (
            !rawSection ||
            typeof rawSection !== 'object'
          ) {
            return;
          }

          const title = sectionTitle(
            rawSection,
            index
          );

          const children =
            getSectionChildren(rawSection);

          if (children.length > 0) {
            const normalizedChildren =
              children
                .map((child: any) => {
                  const normalized =
                    normalizeSnapshotField(child);

                  return {
                    ...normalized,
                    section:
                      normalized.section ||
                      title,
                  };
                });

            structuredSections.push({
              ...rawSection,
              title,
              name:
                rawSection.name || title,
              components:
                normalizedChildren,
            });
          }
        }
      );
    }

    if (isRenderableTemplateNode(node)) {
      const normalized =
        normalizeSnapshotField(node);

      discovered.push({
        ...normalized,
        ...(inheritedSection &&
          !normalized.section
          ? {
            section:
              inheritedSection,
          }
          : {}),
      });
    }

    /*
     * Walk every property instead of only a hardcoded list.
     * Historical schema snapshots may be wrapped in:
     * schema / template / content / definition / layout / etc.
     */
    Object.entries(node).forEach(
      ([key, child]) => {
        if (
          key === 'sections' ||
          key === 'dynamicSections'
        ) {
          if (Array.isArray(child)) {
            child.forEach(
              (
                section: any,
                index: number
              ) => {
                const title =
                  sectionTitle(
                    section,
                    index
                  );

                visit(
                  section,
                  title
                );
              }
            );
          }

          return;
        }

        visit(
          child,
          inheritedSection
        );
      }
    );
  };

  visit(snapshot);

  const directComponents =
    Array.isArray(snapshot.components)
      ? snapshot.components.map(
        normalizeSnapshotField
      )
      : [];

  const directFields =
    Array.isArray(snapshot.fields)
      ? snapshot.fields.map(
        normalizeSnapshotField
      )
      : [];

  const flattenedStructured =
    structuredSections.flatMap(
      (section: any) =>
        Array.isArray(section.components)
          ? section.components
          : []
    );

  const source =
    directComponents.length > 0
      ? directComponents
      : directFields.length > 0
        ? directFields
        : flattenedStructured.length > 0
          ? flattenedStructured
          : discovered;

  const deduped: any[] = [];
  const seen = new Set<string>();

  source.forEach(
    (rawField: any, index: number) => {
      const field =
        normalizeSnapshotField(
          rawField
        );

      const businessKey =
        getReportBusinessFieldKey(
          field
        );

      /*
       * Layout-only components can legitimately have no
       * business key, so retain them using component id.
       */
      const identity =
        businessKey ||
        (
          typeof field.id === 'string'
            ? `id:${field.id}`
            : `index:${index}`
        );

      if (seen.has(identity)) {
        return;
      }

      seen.add(identity);
      deduped.push(field);
    }
  );

  let finalSections = structuredSections;

  /*
   * If no structured sections were discovered,
   * build them from each component's persisted section.
   */
  if (
    finalSections.length === 0 &&
    deduped.length > 0
  ) {
    const grouped =
      new Map<string, any[]>();

    deduped.forEach((field: any) => {
      const title = String(
        field.section ||
        field.sectionTitle ||
        field.section_name ||
        'General Information'
      );

      if (!grouped.has(title)) {
        grouped.set(title, []);
      }

      grouped
        .get(title)!
        .push(field);
    });

    finalSections = Array.from(
      grouped.entries()
    ).map(
      ([title, components]) => ({
        title,
        name: title,
        components,
      })
    );
  }

  return {
    ...snapshot,

    /*
     * Stable compatibility shape consumed by
     * View and Edit.
     */
    components: deduped,
    fields: deduped,

    sections: finalSections,

    dynamicSections:
      finalSections,
  };
}

/**
 * Convert persisted report values to canonical business-key state
 * before filling/editing.
 *
 * component.id is read only as a legacy compatibility fallback.
 * It is NEVER returned as a persistence key.
 */
export function normalizeReportDataForEditing(
  rawReportData: Record<string, any> = {},
  template?: any
): Record<string, any> {
  if (!rawReportData) {
    return {};
  }

  if (!template) {
    return {
      ...rawReportData,
    };
  }

  const normalizedTemplate =
    normalizeReportTemplateSnapshot(
      template
    );

  const comps: any[] = [];

  const add = (items: any) => {
    if (!Array.isArray(items)) {
      return;
    }

    items.forEach((item) => {
      if (item) comps.push(item);
    });
  };

  add(normalizedTemplate.components);
  add(normalizedTemplate.fields);

  if (
    Array.isArray(
      normalizedTemplate.sections
    )
  ) {
    normalizedTemplate.sections.forEach(
      (section: any) => {
        add(section.components);
        add(section.fields);
      }
    );
  }

  if (
    Array.isArray(
      normalizedTemplate.dynamicSections
    )
  ) {
    normalizedTemplate.dynamicSections.forEach(
      (section: any) => {
        add(section.components);
        add(section.fields);
      }
    );
  }

  /*
   * No known components:
   * preserve the existing persisted object instead of
   * accidentally clearing the report.
   */
  if (comps.length === 0) {
    return {
      ...rawReportData,
    };
  }

  const normalized:
    Record<string, any> = {};

  const seenKeys = new Set<string>();

  comps.forEach((comp) => {
    const canonicalKey =
      getReportBusinessFieldKey(
        comp
      );

    if (!canonicalKey) {
      return;
    }

    if (seenKeys.has(canonicalKey)) {
      return;
    }

    seenKeys.add(canonicalKey);

    const compId = comp.id;
    const compKey = comp.key;
    const fieldKey =
      comp.field_key;
    const camelFieldKey =
      comp.fieldKey;

    let resolvedVal:
      any = undefined;

    if (
      rawReportData[
      canonicalKey
      ] !== undefined
    ) {
      resolvedVal =
        rawReportData[
        canonicalKey
        ];
    } else if (
      compKey &&
      rawReportData[
      compKey
      ] !== undefined
    ) {
      resolvedVal =
        rawReportData[
        compKey
        ];
    } else if (
      fieldKey &&
      rawReportData[
      fieldKey
      ] !== undefined
    ) {
      resolvedVal =
        rawReportData[
        fieldKey
        ];
    } else if (
      camelFieldKey &&
      rawReportData[
      camelFieldKey
      ] !== undefined
    ) {
      resolvedVal =
        rawReportData[
        camelFieldKey
        ];
    } else if (
      compId &&
      rawReportData[
      compId
      ] !== undefined
    ) {
      /*
       * Legacy read compatibility only.
       * Write remains canonicalKey.
       */
      resolvedVal =
        rawReportData[
        compId
        ];
    }

    if (resolvedVal !== undefined) {
      normalized[
        canonicalKey
      ] = resolvedVal;
    }
  });

  return normalized;
}
