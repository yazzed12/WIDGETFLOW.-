import type { TemplateTheme, TemplateComponent } from '../types/index.js';

export const SAFE_FONT_FAMILIES = [
  { id: 'Inter', name: 'Inter (Sans-serif)', stack: 'Inter, system-ui, -apple-system, sans-serif' },
  { id: 'Roboto', name: 'Roboto (Modern)', stack: 'Roboto, system-ui, sans-serif' },
  { id: 'Outfit', name: 'Outfit (Clean)', stack: 'Outfit, system-ui, sans-serif' },
  { id: 'Arial', name: 'Arial (Standard)', stack: 'Arial, Helvetica, sans-serif' },
  { id: 'Helvetica', name: 'Helvetica (Classic)', stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { id: 'Georgia', name: 'Georgia (Serif)', stack: 'Georgia, serif' },
  { id: 'Times New Roman', name: 'Times New Roman (Formal)', stack: '"Times New Roman", Times, serif' },
  { id: 'Courier New', name: 'Courier New (Monospace)', stack: '"Courier New", Courier, monospace' },
];

export const DEFAULT_THEME_TOKENS: Record<string, Required<TemplateTheme>> = {
  clean: {
    preset: 'clean',
    accent: 'indigo',
    density: 'comfortable',
    pageStyle: 'plain',
    name: 'Clean Light',
    primaryColor: '#4f46e5',
    secondaryColor: '#6366f1',
    accentColor: '#818cf8',
    textPrimaryColor: '#0f172a',
    textSecondaryColor: '#475569',
    textMutedColor: '#94a3b8',
    bgColor: '#f8fafc',
    surfaceColor: '#ffffff',
    borderColor: '#e2e8f0',
    infoColor: '#0284c7',
    successColor: '#16a34a',
    warningColor: '#d97706',
    dangerColor: '#dc2626',
    bodyFont: 'Inter',
    headingFont: 'Inter',
    typography: {
      h1: { fontFamily: 'Inter', fontSize: '28px', fontWeight: '800', fontColor: '#0f172a', lineHeight: '1.2' },
      h2: { fontFamily: 'Inter', fontSize: '22px', fontWeight: '700', fontColor: '#1e293b', lineHeight: '1.3' },
      h3: { fontFamily: 'Inter', fontSize: '18px', fontWeight: '600', fontColor: '#334155', lineHeight: '1.4' },
      body: { fontFamily: 'Inter', fontSize: '14px', fontWeight: '400', fontColor: '#334155', lineHeight: '1.5' },
      label: { fontFamily: 'Inter', fontSize: '12px', fontWeight: '700', fontColor: '#1e293b', lineHeight: '1.4' },
      caption: { fontFamily: 'Inter', fontSize: '11px', fontWeight: '400', fontColor: '#64748b', lineHeight: '1.4' },
    },
    formStyles: { borderRadius: 'medium', density: 'comfortable', fieldBg: '#f8fafc', borderColor: '#cbd5e1' },
    tableStyles: { headerBg: '#f1f5f9', headerTextColor: '#0f172a', borderColor: '#e2e8f0', density: 'comfortable' },
    documentSpacing: { sectionGap: 'standard', componentGap: 'standard', pagePadding: 'standard' },
  },

  corporate: {
    preset: 'corporate',
    accent: 'slate',
    density: 'comfortable',
    pageStyle: 'card',
    name: 'Corporate Navy',
    primaryColor: '#1e3a8a',
    secondaryColor: '#3b82f6',
    accentColor: '#60a5fa',
    textPrimaryColor: '#0f172a',
    textSecondaryColor: '#334155',
    textMutedColor: '#64748b',
    bgColor: '#f1f5f9',
    surfaceColor: '#ffffff',
    borderColor: '#cbd5e1',
    infoColor: '#0284c7',
    successColor: '#15803d',
    warningColor: '#b45309',
    dangerColor: '#b91c1c',
    bodyFont: 'Helvetica',
    headingFont: 'Helvetica',
    typography: {
      h1: { fontFamily: 'Helvetica', fontSize: '30px', fontWeight: '800', fontColor: '#1e3a8a', lineHeight: '1.2' },
      h2: { fontFamily: 'Helvetica', fontSize: '24px', fontWeight: '700', fontColor: '#1e293b', lineHeight: '1.3' },
      h3: { fontFamily: 'Helvetica', fontSize: '18px', fontWeight: '600', fontColor: '#334155', lineHeight: '1.4' },
      body: { fontFamily: 'Helvetica', fontSize: '14px', fontWeight: '400', fontColor: '#334155', lineHeight: '1.5' },
      label: { fontFamily: 'Helvetica', fontSize: '12px', fontWeight: '700', fontColor: '#1e3a8a', lineHeight: '1.4' },
      caption: { fontFamily: 'Helvetica', fontSize: '11px', fontWeight: '400', fontColor: '#64748b', lineHeight: '1.4' },
    },
    formStyles: { borderRadius: 'small', density: 'standard', fieldBg: '#ffffff', borderColor: '#94a3b8' },
    tableStyles: { headerBg: '#1e3a8a', headerTextColor: '#ffffff', borderColor: '#cbd5e1', density: 'standard' },
    documentSpacing: { sectionGap: 'standard', componentGap: 'standard', pagePadding: 'standard' },
  },

  executive: {
    preset: 'executive',
    accent: 'emerald',
    density: 'comfortable',
    pageStyle: 'card',
    name: 'Executive Emerald',
    primaryColor: '#065f46',
    secondaryColor: '#059669',
    accentColor: '#34d399',
    textPrimaryColor: '#064e3b',
    textSecondaryColor: '#1f2937',
    textMutedColor: '#6b7280',
    bgColor: '#f0fdf4',
    surfaceColor: '#ffffff',
    borderColor: '#a7f3d0',
    infoColor: '#0284c7',
    successColor: '#047857',
    warningColor: '#d97706',
    dangerColor: '#b91c1c',
    bodyFont: 'Georgia',
    headingFont: 'Georgia',
    typography: {
      h1: { fontFamily: 'Georgia', fontSize: '32px', fontWeight: '700', fontColor: '#065f46', lineHeight: '1.2' },
      h2: { fontFamily: 'Georgia', fontSize: '24px', fontWeight: '700', fontColor: '#064e3b', lineHeight: '1.3' },
      h3: { fontFamily: 'Georgia', fontSize: '19px', fontWeight: '600', fontColor: '#111827', lineHeight: '1.4' },
      body: { fontFamily: 'Georgia', fontSize: '15px', fontWeight: '400', fontColor: '#111827', lineHeight: '1.6' },
      label: { fontFamily: 'Georgia', fontSize: '13px', fontWeight: '700', fontColor: '#065f46', lineHeight: '1.4' },
      caption: { fontFamily: 'Georgia', fontSize: '12px', fontWeight: '400', fontColor: '#4b5563', lineHeight: '1.4' },
    },
    formStyles: { borderRadius: 'medium', density: 'comfortable', fieldBg: '#ffffff', borderColor: '#6ee7b7' },
    tableStyles: { headerBg: '#065f46', headerTextColor: '#ffffff', borderColor: '#a7f3d0', density: 'comfortable' },
    documentSpacing: { sectionGap: 'spacious', componentGap: 'standard', pagePadding: 'spacious' },
  },

  minimal: {
    preset: 'minimal',
    accent: 'slate',
    density: 'compact',
    pageStyle: 'plain',
    name: 'Minimal Mono',
    primaryColor: '#0f172a',
    secondaryColor: '#334155',
    accentColor: '#64748b',
    textPrimaryColor: '#0f172a',
    textSecondaryColor: '#475569',
    textMutedColor: '#94a3b8',
    bgColor: '#ffffff',
    surfaceColor: '#ffffff',
    borderColor: '#e2e8f0',
    infoColor: '#0284c7',
    successColor: '#16a34a',
    warningColor: '#d97706',
    dangerColor: '#dc2626',
    bodyFont: 'Roboto',
    headingFont: 'Roboto',
    typography: {
      h1: { fontFamily: 'Roboto', fontSize: '26px', fontWeight: '700', fontColor: '#0f172a', lineHeight: '1.2' },
      h2: { fontFamily: 'Roboto', fontSize: '20px', fontWeight: '600', fontColor: '#1e293b', lineHeight: '1.3' },
      h3: { fontFamily: 'Roboto', fontSize: '16px', fontWeight: '600', fontColor: '#334155', lineHeight: '1.4' },
      body: { fontFamily: 'Roboto', fontSize: '13px', fontWeight: '400', fontColor: '#334155', lineHeight: '1.5' },
      label: { fontFamily: 'Roboto', fontSize: '11px', fontWeight: '700', fontColor: '#0f172a', lineHeight: '1.4' },
      caption: { fontFamily: 'Roboto', fontSize: '10px', fontWeight: '400', fontColor: '#64748b', lineHeight: '1.4' },
    },
    formStyles: { borderRadius: 'square', density: 'compact', fieldBg: '#ffffff', borderColor: '#cbd5e1' },
    tableStyles: { headerBg: '#f8fafc', headerTextColor: '#0f172a', borderColor: '#e2e8f0', density: 'compact' },
    documentSpacing: { sectionGap: 'compact', componentGap: 'compact', pagePadding: 'compact' },
  },
};

/**
 * Gets font CSS stack from font family name
 */
export function getFontFamilyStack(fontName?: string): string {
  if (!fontName || fontName === 'theme') return 'Inter, system-ui, sans-serif';
  const found = SAFE_FONT_FAMILIES.find((f) => f.id.toLowerCase() === fontName.toLowerCase());
  return found ? found.stack : `${fontName}, system-ui, sans-serif`;
}

/**
 * Resolves full effective Theme object, merging baseline tokens
 */
export function resolveEffectiveTheme(theme?: TemplateTheme): Required<TemplateTheme> {
  const presetKey = (theme?.preset || 'clean') as keyof typeof DEFAULT_THEME_TOKENS;
  const base = DEFAULT_THEME_TOKENS[presetKey] || DEFAULT_THEME_TOKENS.clean;

  return {
    ...base,
    ...theme,
    typography: {
      ...base.typography,
      ...(theme?.typography || {}),
    },
    formStyles: {
      ...base.formStyles,
      ...(theme?.formStyles || {}),
    },
    tableStyles: {
      ...base.tableStyles,
      ...(theme?.tableStyles || {}),
    },
    documentSpacing: {
      ...base.documentSpacing,
      ...(theme?.documentSpacing || {}),
    },
  };
}

export function resolveDocumentSpacing(theme?: TemplateTheme) {
  const spacing = resolveEffectiveTheme(theme).documentSpacing;
  const values = {
    compact: { section: '12px', component: '8px', page: '16px' },
    standard: { section: '24px', component: '16px', page: '24px' },
    spacious: { section: '32px', component: '24px', page: '32px' },
  } as const;
  return {
    sectionGap: values[spacing.sectionGap].section,
    componentGap: values[spacing.componentGap].component,
    pagePadding: values[spacing.pagePadding].page,
  };
}

export function resolveSectionStyle(theme?: TemplateTheme) {
  const effTheme = resolveEffectiveTheme(theme);
  return {
    backgroundColor: effTheme.surfaceColor || '#ffffff',
    borderColor: effTheme.borderColor || '#e2e8f0',
    color: effTheme.textPrimaryColor || '#0f172a',
  };
}

/**
 * Dynamic Style Inheritance Resolver:
 * Computes resolved visual style for a component based on:
 * componentLocalOverride ?? themeToken ?? systemFallback
 */
export function resolveComponentStyle(
  comp: TemplateComponent,
  theme?: TemplateTheme
) {
  const effTheme = resolveEffectiveTheme(theme);
  const type = comp.type;

  // Headings
  if (type === 'heading') {
    const cfg = comp.headingConfig || {};
    const level = cfg.headingLevel || 'h2';
    const themeTypo = (effTheme.typography && (effTheme.typography as any)[level]) || {
      fontFamily: effTheme.headingFont || 'Inter',
      fontSize: level === 'h1' ? '28px' : level === 'h3' ? '18px' : '22px',
      fontWeight: '700',
      fontColor: effTheme.textPrimaryColor || '#0f172a',
    };

    const fontFamily = cfg.fontFamily && cfg.fontFamily !== 'theme' ? cfg.fontFamily : themeTypo.fontFamily;
    const fontColor = cfg.fontColor && cfg.fontColor !== 'theme'
      ? cfg.fontColor
      : cfg.textColor && cfg.textColor !== 'default' && cfg.textColor !== 'theme'
      ? cfg.textColor
      : themeTypo.fontColor;

    let fontSize = themeTypo.fontSize;
    if (cfg.fontSize && cfg.fontSize !== 'theme') {
      if (cfg.fontSize === 'small') fontSize = '16px';
      else if (cfg.fontSize === 'medium') fontSize = '20px';
      else if (cfg.fontSize === 'large') fontSize = '24px';
      else if (cfg.fontSize === 'xlarge') fontSize = '32px';
      else fontSize = cfg.fontSize;
    }

    let fontWeight = themeTypo.fontWeight;
    if (cfg.fontWeight && cfg.fontWeight !== 'theme') {
      if (cfg.fontWeight === 'normal') fontWeight = '400';
      else if (cfg.fontWeight === 'medium') fontWeight = '500';
      else if (cfg.fontWeight === 'bold') fontWeight = '700';
      else if (cfg.fontWeight === 'extrabold') fontWeight = '800';
      else fontWeight = cfg.fontWeight;
    }

    return {
      fontFamily: getFontFamilyStack(fontFamily),
      fontSize,
      fontWeight,
      color: fontColor,
      textAlign: (cfg.alignment || (comp as any).alignment || 'left') as any,
      lineHeight: cfg.lineHeight && cfg.lineHeight !== 'theme' ? cfg.lineHeight : themeTypo.lineHeight || '1.2',
      letterSpacing: cfg.letterSpacing && cfg.letterSpacing !== 'theme'
        ? cfg.letterSpacing === 'tight' ? '-0.02em' : cfg.letterSpacing === 'wide' ? '0.04em' : 'normal'
        : 'normal',
      marginTop: typeof cfg.spaceAbove === 'number' ? `${cfg.spaceAbove}px` : cfg.spaceAbove === 'large' ? '24px' : cfg.spaceAbove === 'medium' ? '16px' : '0px',
      marginBottom: typeof cfg.spaceBelow === 'number' ? `${cfg.spaceBelow}px` : cfg.spaceBelow === 'large' ? '24px' : cfg.spaceBelow === 'medium' ? '16px' : '8px',
      isOverridden: (cfg.fontFamily && cfg.fontFamily !== 'theme') || (cfg.fontColor && cfg.fontColor !== 'theme') || (cfg.fontSize && cfg.fontSize !== 'theme') || (cfg.fontWeight && cfg.fontWeight !== 'theme'),
    };
  }

  // Paragraphs
  if (type === 'paragraph' || type === 'text') {
    const cfg = comp.paragraphConfig || {};
    const themeTypo = (effTheme.typography && effTheme.typography.body) || {
      fontFamily: effTheme.bodyFont || 'Inter',
      fontSize: '14px',
      fontWeight: '400',
      fontColor: effTheme.textPrimaryColor || '#0f172a',
      lineHeight: '1.5',
    };

    const fontFamily = cfg.fontFamily && cfg.fontFamily !== 'theme' ? cfg.fontFamily : themeTypo.fontFamily;
    const fontColor = cfg.fontColor && cfg.fontColor !== 'theme'
      ? cfg.fontColor
      : cfg.textColor && cfg.textColor !== 'default' && cfg.textColor !== 'theme'
      ? cfg.textColor
      : themeTypo.fontColor;

    let fontSize = themeTypo.fontSize;
    if (cfg.fontSize && cfg.fontSize !== 'theme') {
      if (cfg.fontSize === 'small') fontSize = '12px';
      else if (cfg.fontSize === 'medium') fontSize = '14px';
      else if (cfg.fontSize === 'large') fontSize = '18px';
      else fontSize = cfg.fontSize;
    }

    return {
      fontFamily: getFontFamilyStack(fontFamily),
      fontSize,
      fontWeight: cfg.fontWeight && cfg.fontWeight !== 'theme' ? cfg.fontWeight : themeTypo.fontWeight,
      color: fontColor,
      textAlign: (cfg.alignment || (comp as any).alignment || 'left') as any,
      letterSpacing: cfg.letterSpacing && cfg.letterSpacing !== 'theme'
        ? cfg.letterSpacing === 'tight' ? '-0.01em' : cfg.letterSpacing === 'wide' ? '0.03em' : 'normal'
        : 'normal',
      lineHeight: cfg.lineHeight && cfg.lineHeight !== 'theme' ? cfg.lineHeight : themeTypo.lineHeight || '1.5',
      marginBottom: typeof cfg.paragraphSpacing === 'number' ? `${cfg.paragraphSpacing}px` : '12px',
      isOverridden: (cfg.fontFamily && cfg.fontFamily !== 'theme') || (cfg.fontColor && cfg.fontColor !== 'theme') || (cfg.fontSize && cfg.fontSize !== 'theme'),
    };
  }

  // Generic fallback
  const bodyTypo = effTheme.typography?.body || {
    fontSize: '14px',
    fontWeight: '400',
  };
  return {
    fontFamily: getFontFamilyStack(effTheme.bodyFont),
    fontSize: bodyTypo.fontSize,
    fontWeight: bodyTypo.fontWeight,
    color: effTheme.textPrimaryColor,
    isOverridden: false,
  };
}

/**
 * Resolves optional element-level appearance overrides. An absent value means
 * the renderer should keep its existing Theme/component default. This keeps
 * old templates visually unchanged and avoids copying Theme tokens into every
 * component.
 */
export function resolveElementAppearance(comp: any): {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: 'solid' | 'dashed' | 'none';
  borderRadius?: string;
  padding?: string;
  textAlign?: 'left' | 'center' | 'right';
  hasOverrides: boolean;
} {
  const appearance = comp?.appearance || {};
  const customColor = (value: unknown): string | undefined => typeof value === 'string' && value && value !== 'theme' ? value : undefined;
  const has = Object.keys(appearance).some((key) => appearance[key] !== undefined && appearance[key] !== 'theme');
  return {
    backgroundColor: customColor(appearance.backgroundColor),
    borderColor: customColor(appearance.borderColor),
    borderWidth: typeof appearance.borderWidth === 'number' ? `${appearance.borderWidth}px` : undefined,
    borderStyle: appearance.borderStyle && appearance.borderStyle !== 'none' ? appearance.borderStyle : appearance.borderStyle === 'none' ? 'none' : undefined,
    borderRadius: typeof appearance.borderRadius === 'number' ? `${appearance.borderRadius}px` : undefined,
    padding: typeof appearance.padding === 'number' ? `${appearance.padding}px` : undefined,
    textAlign: appearance.textAlign,
    hasOverrides: has,
  };
}

/**
 * Resolves Form Input styling: label typography, field background, border, radius, density & caption.
 * Rule: componentLocalOverride ?? themeToken ?? systemFallback
 */
export function resolveFormStyle(comp: any, theme?: TemplateTheme) {
  const effTheme = resolveEffectiveTheme(theme);
  const labelTypo = effTheme.typography?.label || {
    fontFamily: effTheme.bodyFont || 'Inter',
    fontSize: '12px',
    fontWeight: '700',
    fontColor: effTheme.textPrimaryColor || '#0f172a',
  };
  const captionTypo = effTheme.typography?.caption || {
    fontFamily: effTheme.bodyFont || 'Inter',
    fontSize: '11px',
    fontWeight: '400',
    fontColor: effTheme.textMutedColor || '#64748b',
  };
  const fStyles = effTheme.formStyles || {
    borderRadius: 'medium',
    density: 'comfortable',
    fieldBg: '#ffffff',
    borderColor: '#cbd5e1',
  };

  const localStyle = comp?.styleOverride || comp?.style || {};
  const appearance = comp?.appearance || {};

  const labelFontFamily = localStyle.labelFontFamily && localStyle.labelFontFamily !== 'theme'
    ? localStyle.labelFontFamily
    : labelTypo.fontFamily;

  const labelFontColor = localStyle.labelFontColor && localStyle.labelFontColor !== 'theme'
    ? localStyle.labelFontColor
    : labelStyleColorFallback(localStyle.labelColor, labelTypo.fontColor);

  const fieldBg = appearance.backgroundColor && appearance.backgroundColor !== 'theme'
    ? appearance.backgroundColor
    : localStyle.fieldBg && localStyle.fieldBg !== 'theme'
    ? localStyle.fieldBg
    : fStyles.fieldBg || '#ffffff';

  const borderColor = appearance.borderColor && appearance.borderColor !== 'theme'
    ? appearance.borderColor
    : localStyle.borderColor && localStyle.borderColor !== 'theme'
    ? localStyle.borderColor
    : fStyles.borderColor || effTheme.borderColor || '#cbd5e1';

  return {
    labelFontFamily: getFontFamilyStack(labelFontFamily),
    labelFontSize: labelTypo.fontSize || '12px',
    labelFontWeight: labelTypo.fontWeight || '700',
    labelColor: labelFontColor,
    captionFontFamily: getFontFamilyStack(captionTypo.fontFamily),
    captionColor: captionTypo.fontColor || effTheme.textMutedColor || '#64748b',
    fieldBg,
    borderColor,
    borderRadius: typeof appearance.borderRadius === 'number'
      ? `${appearance.borderRadius}px`
      : fStyles.borderRadius === 'small' ? '6px' : fStyles.borderRadius === 'square' ? '0px' : '12px',
    borderWidth: typeof appearance.borderWidth === 'number' ? `${appearance.borderWidth}px` : undefined,
    borderStyle: appearance.borderStyle === 'none' ? 'none' : appearance.borderStyle || undefined,
    padding: typeof appearance.padding === 'number' ? `${appearance.padding}px` : undefined,
    density: fStyles.density || 'comfortable',
    isOverridden: Boolean(localStyle.labelFontFamily || localStyle.labelFontColor || localStyle.fieldBg || localStyle.borderColor),
  };
}

function labelStyleColorFallback(override: string | undefined, fallback: string): string {
  if (override && override !== 'theme') return override;
  return fallback;
}

/**
 * Resolves Data Table V2 Theme styling: headers, body cells, borders, density.
 */
export function resolveTableStyle(comp: any, theme?: TemplateTheme) {
  const effTheme = resolveEffectiveTheme(theme);
  const tConf = comp?.tableConfig || {};
  const localHeaderBg = tConf.headerBg || comp?.styleOverride?.headerBg;
  const localHeaderTextColor = tConf.headerTextColor || comp?.styleOverride?.headerTextColor;
  const localBorderColor = tConf.borderColor || comp?.styleOverride?.borderColor;
  const localFontFamily = tConf.fontFamily || comp?.styleOverride?.fontFamily;

  const headerBg = localHeaderBg && localHeaderBg !== 'theme'
    ? localHeaderBg
    : effTheme.tableStyles?.headerBg || effTheme.primaryColor || '#f1f5f9';

  const headerTextColor = localHeaderTextColor && localHeaderTextColor !== 'theme'
    ? localHeaderTextColor
    : effTheme.tableStyles?.headerTextColor || '#0f172a';

  const borderColor = localBorderColor && localBorderColor !== 'theme'
    ? localBorderColor
    : effTheme.tableStyles?.borderColor || effTheme.borderColor || '#e2e8f0';

  const tableFontFamily = localFontFamily && localFontFamily !== 'theme'
    ? localFontFamily
    : effTheme.bodyFont || 'Inter';

  return {
    headerBg,
    headerTextColor,
    borderColor,
    headerFontFamily: getFontFamilyStack(effTheme.headingFont || tableFontFamily),
    bodyFontFamily: getFontFamilyStack(tableFontFamily),
    bodyTextColor: effTheme.textPrimaryColor || '#0f172a',
    density: tConf.density || effTheme.tableStyles?.density || 'comfortable',
    isHeaderBgOverridden: Boolean(localHeaderBg && localHeaderBg !== 'theme'),
  };
}

/**
 * Resolves KPI Metric Block Theme styling: typography, border, surface, semantic trend colors.
 */
export function resolveKPIStyle(comp: any, theme?: TemplateTheme) {
  const effTheme = resolveEffectiveTheme(theme);
  const kConf = comp?.kpiConfig || {};
  const localFontColor = kConf.valueColor || comp?.styleOverride?.valueColor;
  const localFontFamily = kConf.fontFamily || comp?.styleOverride?.fontFamily;
  const localBg = kConf.bg || comp?.styleOverride?.bg;

  const fontFamily = localFontFamily && localFontFamily !== 'theme'
    ? localFontFamily
    : effTheme.bodyFont || 'Inter';

  const valueColor = localFontColor && localFontColor !== 'theme'
    ? localFontColor
    : effTheme.textPrimaryColor || '#0f172a';

  const surfaceBg = localBg && localBg !== 'theme'
    ? localBg
    : effTheme.surfaceColor || '#ffffff';

  return {
    fontFamily: getFontFamilyStack(fontFamily),
    labelTypography: {
      fontFamily: getFontFamilyStack(effTheme.typography?.label?.fontFamily || fontFamily),
      fontSize: effTheme.typography?.label?.fontSize || '12px',
      fontWeight: effTheme.typography?.label?.fontWeight || '700',
      color: effTheme.textMutedColor || '#64748b',
    },
    valueColor,
    helperTextColor: effTheme.textSecondaryColor || '#64748b',
    surfaceBg,
    borderColor: effTheme.borderColor || '#e2e8f0',
    trendColors: {
      success: effTheme.successColor || '#16a34a',
      warning: effTheme.warningColor || '#d97706',
      danger: effTheme.dangerColor || '#dc2626',
      neutral: effTheme.textSecondaryColor || '#64748b',
    },
    isValueColorOverridden: Boolean(localFontColor && localFontColor !== 'theme'),
  };
}

/**
 * Resolves container styling for Repeating Group and section cards.
 */
export function resolveContainerStyle(comp: any, theme?: TemplateTheme) {
  const effTheme = resolveEffectiveTheme(theme);
  const rgConf = comp?.repeatingGroupConfig || {};
  const localBg = rgConf.bg || comp?.styleOverride?.bg;
  const localBorderColor = rgConf.borderColor || comp?.styleOverride?.borderColor;

  const surfaceBg = localBg && localBg !== 'theme' ? localBg : effTheme.surfaceColor || '#ffffff';
  const borderColor = localBorderColor && localBorderColor !== 'theme' ? localBorderColor : effTheme.borderColor || '#e2e8f0';

  return {
    surfaceBg,
    borderColor,
    borderRadius: effTheme.formStyles?.borderRadius === 'small' ? '8px' : '16px',
    labelFontFamily: getFontFamilyStack(effTheme.headingFont || effTheme.bodyFont),
    labelColor: effTheme.textPrimaryColor || '#0f172a',
    itemSpacing: effTheme.documentSpacing?.componentGap === 'compact' ? '8px' : '16px',
  };
}

/**
 * Resolves Signature presentation card shell styling ONLY.
 * Theme MUST NOT recolor, filter, tint, or alter signature image pixels or business data.
 */
export function resolveSignatureShellStyle(_comp: any, theme?: TemplateTheme) {
  const effTheme = resolveEffectiveTheme(theme);
  const labelTypo = effTheme.typography?.label || {
    fontFamily: effTheme.bodyFont || 'Inter',
    fontSize: '12px',
    fontWeight: '700',
    fontColor: effTheme.textPrimaryColor || '#0f172a',
  };

  return {
    labelFontFamily: getFontFamilyStack(labelTypo.fontFamily),
    labelColor: labelTypo.fontColor || effTheme.textPrimaryColor || '#0f172a',
    surfaceBg: effTheme.surfaceColor || '#ffffff',
    borderColor: effTheme.borderColor || '#e2e8f0',
    verificationTextColor: effTheme.textMutedColor || '#64748b',
    borderRadius: '16px',
  };
}

/**
 * Resolves semantic Theme color tokens (info, success, warning, danger, primary, secondary, muted).
 */
export function resolveSemanticColor(
  semantic: 'info' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary' | 'muted',
  theme?: TemplateTheme
): string {
  const effTheme = resolveEffectiveTheme(theme);
  switch (semantic) {
    case 'info':
      return effTheme.infoColor || '#0284c7';
    case 'success':
      return effTheme.successColor || '#16a34a';
    case 'warning':
      return effTheme.warningColor || '#d97706';
    case 'danger':
      return effTheme.dangerColor || '#dc2626';
    case 'primary':
      return effTheme.textPrimaryColor || '#0f172a';
    case 'secondary':
      return effTheme.textSecondaryColor || '#475569';
    case 'muted':
      return effTheme.textMutedColor || '#94a3b8';
    default:
      return effTheme.textPrimaryColor || '#0f172a';
  }
}
