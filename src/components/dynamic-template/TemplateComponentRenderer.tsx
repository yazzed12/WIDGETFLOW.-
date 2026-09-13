import React from 'react';
import { getReportBusinessFieldKey } from '../../shared/signatureResolver';
import type { ReportTemplateField, TemplateComponent, ComponentOption } from '../../types';
import { TableV2Renderer } from './TableV2Renderer';
import { RatingInputControl } from './RatingInputControl';
import { AcknowledgementControl } from './AcknowledgementControl';
import { FileAttachmentControl } from './FileAttachmentControl';
import { RepeatingGroupRenderer } from './RepeatingGroupRenderer.js';
import { sanitizeParagraphHtml } from '../../shared/display-tools/paragraphSanitizer.js';
import {
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';
import { SignatureRenderer } from './SignatureRenderer.js';
import { resolveAssetUrl, getSpacerHeightPx } from '../../shared/display-tools/displayUtils.js';
import {
  resolveComponentStyle,
  resolveFormStyle,
  resolveKPIStyle,
} from '../../shared/themeResolver.js';
import type { TemplateTheme } from '../../types';
import { AuthenticatedAssetImage } from '../common/AuthenticatedAssetImage';

interface TemplateComponentRendererProps {
  component: ReportTemplateField | TemplateComponent;
  value: any;
  mode: 'edit' | 'readOnly';
  onChange?: (key: string, val: any) => void;
  error?: string;
  disabled?: boolean;
  isCalculated?: boolean;
  activeSignature?: any;
  activeSignatures?: any[];
  signatureHistory?: any[];
  currentUser?: any;
  theme?: TemplateTheme;
  reportId?: string;
}

const ImageComponentRenderer: React.FC<{
  component: ReportTemplateField | TemplateComponent;
  mode: 'edit' | 'readOnly';
  label?: string;
  colClass: string;
}> = ({ component, mode, label, colClass }) => {
  const [imageError, setImageError] = React.useState(false);

  const iConf = (component as any).imageConfig || {};
  const align = iConf.alignment || (component as any).alignment || 'center';
  const width = iConf.imageWidth || 'medium';
  const fitMode = iConf.fitMode || 'contain';

  const rawUrl = iConf.assetUrl || (component as any).assetUrl;
  const rawId = iConf.assetId || (component as any).assetId;
  const resolvedUrl = resolveAssetUrl(rawUrl, rawId);
  const alt = iConf.altText || (component as any).altText || label || 'Template image';
  const caption = iConf.caption || (component as any).caption;

  const alignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  const widthClass = width === 'small' ? 'w-1/4' : width === 'large' ? 'w-3/4' : width === 'full' ? 'w-full' : 'w-1/2';
  const fitClass = fitMode === 'cover' ? 'object-cover' : fitMode === 'natural' ? 'object-none' : 'object-contain';

  React.useEffect(() => {
    setImageError(false);
  }, [resolvedUrl]);

  return (
    <div className={`${colClass} ${alignClass} space-y-1.5 py-2`}>
      {resolvedUrl && !imageError ? (
        <AuthenticatedAssetImage
          src={resolvedUrl}
          alt={alt}
          onError={() => setImageError(true)}
          className={`max-h-72 rounded-2xl shadow-xs border border-slate-200 inline-block ${widthClass} ${fitClass}`}
        />
      ) : resolvedUrl && imageError ? (
        mode === 'edit' ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl inline-block text-left text-xs text-rose-900 space-y-2 max-w-md shadow-xs">
            <div className="flex items-center gap-2 font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Image could not be loaded.</span>
            </div>
            <p className="text-[11px] text-rose-600 leading-relaxed">
              The image asset referenced at <code className="font-mono bg-rose-100 px-1 py-0.5 rounded select-all">{resolvedUrl}</code> could not be fetched or is unavailable.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl inline-block text-slate-500 text-xs italic">
            [Image: {alt}]
          </div>
        )
      ) : (
        <div className="p-6 bg-slate-100/80 border border-dashed border-slate-300 rounded-2xl inline-block text-slate-400 text-xs font-semibold">
          {label || 'Image Asset Placeholder'}
        </div>
      )}
      {caption && <p className="text-[11px] text-slate-500 italic">{caption}</p>}
    </div>
  );
};

export const TemplateComponentRenderer: React.FC<TemplateComponentRendererProps> = ({
  component,
  value,
  mode,
  onChange,
  error,
  disabled,
  isCalculated,
  activeSignature,
  activeSignatures,
  signatureHistory,
  currentUser,
  theme,
  reportId,
}) => {
  const fieldKey = getReportBusinessFieldKey(component) || '';
  const label = component.label || fieldKey;
  const layoutWidth = (component as any).layoutWidth
    || (component as any).layout?.width
    || (component as any).configuration?.layoutWidth
    || (component as any).configuration?.layout?.width
    || 'full';

  // Responsive Grid Width Mapping
  const getColSpanClass = (width: string) => {
    switch (width) {
      case 'half':
        return 'col-span-12 sm:col-span-6';
      case 'third':
        return 'col-span-12 sm:col-span-4';
      case 'full':
      default:
        return 'col-span-12';
    }
  };

  const colClass = getColSpanClass(layoutWidth);

  // Normalize Options
  const getNormalizedOptions = (): ComponentOption[] => {
    if (!component.options) return [];
    return component.options.map((opt: any) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt };
      }
      return opt;
    });
  };

  const options = getNormalizedOptions();

  // Helper date formatters
  const formatDate = (val: string) => {
    if (!val) return '-';
    try {
      const d = new Date(val.includes('T') ? val : `${val}T00:00:00`);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return val;
    }
  };

  const formatDateTime = (val: string) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } catch {
      return val;
    }
  };

  // 1. DIVIDER COMPONENT
  if (component.type === 'divider') {
    const dConf = component.dividerConfig || {};
    const style = dConf.dividerStyle || 'solid';
    const thickness = dConf.thickness || 'thin';
    const width = dConf.width || 'full';
    const align = dConf.alignment || 'center';
    const color = dConf.dividerColor || 'default';

    const borderStyleClass = style === 'dashed' ? 'border-dashed' : style === 'dotted' ? 'border-dotted' : 'border-solid';
    const borderThicknessClass = thickness === 'thick' ? 'border-t-4' : thickness === 'medium' ? 'border-t-2' : 'border-t';
    const widthClass = width === '50%' ? 'w-1/2' : width === '75%' ? 'w-3/4' : 'w-full';
    const alignClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';

    const colorMap: Record<string, string> = {
      default: 'border-slate-300/80',
      slate: 'border-slate-400',
      indigo: 'border-indigo-400',
      emerald: 'border-emerald-400',
      amber: 'border-amber-400',
      rose: 'border-rose-400',
    };
    const colorClass = colorMap[color] || colorMap.default;

    return (
      <div className={`${colClass} py-3 flex ${alignClass}`}>
        <div className={`relative flex items-center justify-center ${widthClass}`}>
          <div className={`w-full ${borderThicknessClass} ${borderStyleClass} ${colorClass}`} />
          {label && label !== 'Divider' && (
            <span className="absolute bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200 rounded-full">
              {label}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. SPACER COMPONENT
  if (component.type === 'spacer') {
    const heightPx = getSpacerHeightPx(component);

    if (mode === 'edit') {
      return (
        <div
          className={`${colClass} bg-slate-100/60 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-500 font-mono font-bold select-none my-1`}
          style={{ height: `${heightPx}px`, minHeight: '28px' }}
        >
          <span>↕ Spacer — {heightPx}px</span>
        </div>
      );
    }

    return <div className={colClass} style={{ height: `${heightPx}px` }} />;
  }

  // 3. IMAGE COMPONENT
  if (component.type === 'image') {
    return (
      <ImageComponentRenderer
        component={component}
        mode={mode}
        label={label}
        colClass={colClass}
      />
    );
  }

  // 4. INFO BOX CALLOUT COMPONENT
  if (component.type === 'info_box') {
    const bConf = component.infoBoxConfig || {};
    const preset = bConf.stylePreset || component.stylePreset || 'info';
    const title = bConf.title || label;
    const desc = bConf.description || component.description;
    const showIcon = bConf.showIcon !== false;

    const styleMap: Record<string, { bg: string; border: string; text: string; iconColor: string; IconComponent: any }> = {
      info: { bg: 'bg-blue-50/80', border: 'border-blue-200', text: 'text-blue-900', iconColor: 'text-blue-600', IconComponent: Info },
      success: { bg: 'bg-emerald-50/80', border: 'border-emerald-200', text: 'text-emerald-900', iconColor: 'text-emerald-600', IconComponent: CheckCircle2 },
      warning: { bg: 'bg-amber-50/80', border: 'border-amber-200', text: 'text-amber-900', iconColor: 'text-amber-600', IconComponent: AlertCircle },
      important: { bg: 'bg-rose-50/80', border: 'border-rose-200', text: 'text-rose-900', iconColor: 'text-rose-600', IconComponent: AlertCircle },
      neutral: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900', iconColor: 'text-slate-600', IconComponent: Info },
    };
    const s = styleMap[preset] || styleMap.info;
    const IconComp = s.IconComponent;

    return (
      <div className={`${colClass} p-4 rounded-2xl border ${s.bg} ${s.border} ${s.text} flex items-start gap-3 shadow-2xs`}>
        {showIcon && <IconComp className={`w-5 h-5 shrink-0 mt-0.5 ${s.iconColor}`} />}
        <div className="space-y-0.5 min-w-0 flex-1">
          {title && <h4 className="text-xs font-bold">{title}</h4>}
          {desc && <p className="text-[11px] leading-relaxed opacity-90">{desc}</p>}
        </div>
      </div>
    );
  }

  // 5. KPI METRIC BLOCK COMPONENT
  if (component.type === 'kpi') {
    const kpiConf = component.kpiConfig || {};
    const displayVal = value !== undefined && value !== null ? value : component.defaultValue || '$0.00';
    const trend = kpiConf.trend || 'up';
    const kpiStyle = resolveKPIStyle(component as TemplateComponent, theme);

    return (
      <div
        className={`${colClass} p-5 rounded-2xl shadow-xs space-y-2 border`}
        style={{ backgroundColor: kpiStyle.surfaceBg, borderColor: kpiStyle.borderColor }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{
              fontFamily: kpiStyle.labelTypography.fontFamily,
              color: kpiStyle.labelTypography.color,
            }}
          >
            {label}
          </span>
          <span
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor:
                trend === 'up' ? `${kpiStyle.trendColors.success}15` : trend === 'down' ? `${kpiStyle.trendColors.danger}15` : '#f1f5f9',
              color:
                trend === 'up' ? kpiStyle.trendColors.success : trend === 'down' ? kpiStyle.trendColors.danger : kpiStyle.trendColors.neutral,
            }}
          >
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.toUpperCase()}
          </span>
        </div>

        {mode === 'edit' ? (
          <input
            type="text"
            value={displayVal || ''}
            onChange={(e) => onChange && onChange(fieldKey, e.target.value)}
            placeholder="e.g. $2.4M"
            className="w-full text-xl font-mono font-extrabold bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none"
            style={{ fontFamily: kpiStyle.fontFamily, color: kpiStyle.valueColor }}
          />
        ) : (
          <div
            className="text-2xl font-mono font-extrabold"
            style={{ fontFamily: kpiStyle.fontFamily, color: kpiStyle.valueColor }}
          >
            {String(displayVal)}
          </div>
        )}

        {kpiConf.helperText && (
          <p
            className="text-[11px] font-medium"
            style={{ fontFamily: kpiStyle.fontFamily, color: kpiStyle.helperTextColor }}
          >
            {kpiConf.helperText}
          </p>
        )}
      </div>
    );
  }

  // 6. SIGNATURE FIELD COMPONENT
  if (component.type === 'signature') {
    return (
      <div className={colClass}>
        <SignatureRenderer
          component={component as TemplateComponent}
          readOnly={mode === 'readOnly'}
          activeSignature={(component as any).activeSignature || activeSignature}
          activeSignatures={(component as any).activeSignatures || activeSignatures}
          signatureHistory={(component as any).signatureHistory || signatureHistory}
          currentUser={currentUser}
          theme={theme}
          value={value}
          reportId={reportId}
        />
      </div>
    );
  }

  // 7. TABLE COMPONENT V2
  if (component.type === 'table') {
    return (
      <TableV2Renderer
        component={component as TemplateComponent}
        value={value}
        mode={mode}
        onChange={onChange}
        disabled={disabled}
        theme={theme}
      />
    );
  }

  // REPEATING GROUP COMPONENT
  if (component.type === 'repeating_group') {
    return (
      <RepeatingGroupRenderer
        component={component}
        value={value}
        mode={mode}
        onChange={onChange}
        disabled={disabled}
        theme={theme}
      />
    );
  }

  // 8. RATING COMPONENT
  if (component.type === 'rating') {
    return (
      <div className={`${colClass} space-y-1.5`}>
        <label className="block text-xs font-bold text-slate-800">
          {label}
          {component.required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {component.description && mode === 'edit' && (
          <p className="text-[11px] text-slate-500 leading-snug">{component.description}</p>
        )}
        <RatingInputControl
          component={component as TemplateComponent}
          value={value}
          mode={mode}
          onChange={(k, val) => onChange && onChange(k, val)}
          disabled={disabled}
        />
        {error && (
          <div className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // 9. ACKNOWLEDGEMENT COMPONENT
  if (component.type === 'acknowledgement') {
    return (
      <div className={`${colClass} space-y-1.5`}>
        <label className="block text-xs font-bold text-slate-800">
          {label}
        </label>
        <AcknowledgementControl
          component={component as TemplateComponent}
          value={value}
          mode={mode}
          onChange={(k, val) => onChange && onChange(k, val)}
          disabled={disabled}
          error={error}
        />
        {error && (
          <div className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // 10. FILE ATTACHMENT COMPONENT
  if (component.type === 'file') {
    return (
      <div className={`${colClass} space-y-1.5`}>
        <label className="block text-xs font-bold text-slate-800">
          {label}
          {component.required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {component.description && mode === 'edit' && (
          <p className="text-[11px] text-slate-500 leading-snug">{component.description}</p>
        )}
        <FileAttachmentControl
          component={component as TemplateComponent}
          value={value}
          mode={mode}
          onChange={(k, val) => onChange && onChange(k, val)}
          disabled={disabled}
          error={error}
          reportId={reportId}
        />
      </div>
    );
  }

  // Helper for formatting values in readOnly mode for general input fields
  const renderReadOnlyValue = () => {
    if (value === undefined || value === null || value === '') {
      return <span className="text-slate-400 italic text-xs">Not specified</span>;
    }

    switch (component.type) {
      case 'currency':
        const numVal = Number(value);
        return (
          <span className="font-mono font-bold text-slate-900 flex items-center gap-1 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            {isNaN(numVal) ? value : numVal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </span>
        );
      case 'percentage':
        return (
          <span className="font-mono font-bold text-indigo-700 flex items-center gap-0.5 text-xs">
            {value}% <Percent className="w-3 h-3 text-indigo-500" />
          </span>
        );
      case 'checkbox':
        const isChecked = Boolean(value === true || value === 'true' || value === 1);
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isChecked ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isChecked ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
            {isChecked ? 'Yes / Enabled' : 'No / Disabled'}
          </span>
        );
      case 'date':
        return (
          <span className="font-medium text-slate-800 flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            {formatDate(String(value))}
          </span>
        );
      case 'datetime':
        return (
          <span className="font-medium text-slate-800 flex items-center gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-cyan-600" />
            {formatDateTime(String(value))}
          </span>
        );
      case 'radio':
        return (
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 font-bold rounded-xl text-xs border border-indigo-200 inline-block">
            {String(value)}
          </span>
        );
      case 'textarea':
        return (
          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/80 font-medium">
            {String(value)}
          </p>
        );
      default:
        return <span className="font-semibold text-slate-900 text-xs">{String(value)}</span>;
    }
  };

  // Render Heading
  if (component.type === 'heading') {
    const hConf = component.headingConfig || {};
    const level = hConf.headingLevel || 'h2';
    const subtitle = hConf.subtitle || component.description;
    const resolved = resolveComponentStyle(component as TemplateComponent, theme);
    const HeadingTag = level === 'h1' ? 'h1' : level === 'h3' ? 'h3' : 'h2';

    return (
      <div
        className={`${colClass} border-b border-slate-200/60`}
        style={{
          marginTop: resolved.marginTop,
          marginBottom: resolved.marginBottom,
          textAlign: resolved.textAlign,
        }}
      >
        <HeadingTag
          className="tracking-tight"
          style={{
            fontFamily: resolved.fontFamily,
            fontSize: resolved.fontSize,
            fontWeight: resolved.fontWeight,
            color: resolved.color,
            fontStyle: hConf.italic ? 'italic' : 'normal',
            textDecoration: hConf.underline ? 'underline' : 'none',
          }}
        >
          {label}
        </HeadingTag>
        {subtitle && (
          <p
            className="text-xs text-slate-500 mt-1 leading-normal font-normal"
            style={{ fontFamily: resolved.fontFamily }}
          >
            {subtitle}
          </p>
        )}
      </div>
    );
  }

  // Render Paragraph
  if (component.type === 'paragraph') {
    const pConf = component.paragraphConfig || {};
    const rawContent = pConf.contentHtml || component.label || component.description || '';
    const sanitizedHtml = sanitizeParagraphHtml(rawContent);
    const resolved = resolveComponentStyle(component as TemplateComponent, theme);

    return (
      <div
        className={`${colClass} py-1.5`}
        style={{
          textAlign: resolved.textAlign,
          marginBottom: resolved.marginBottom,
        }}
      >
        <div
          className="prose prose-xs max-w-none text-slate-800 leading-relaxed font-normal"
          style={{
            fontFamily: resolved.fontFamily,
            fontSize: resolved.fontSize,
            fontWeight: resolved.fontWeight,
            color: resolved.color,
            lineHeight: resolved.lineHeight,
          }}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    );
  }

  // Standard Recognized Form Input Fields (text, textarea, number, currency, percentage, date, datetime, select, radio, checkbox)
  const isRecognizedInput = [
    'text',
    'textarea',
    'number',
    'currency',
    'percentage',
    'date',
    'datetime',
    'select',
    'radio',
    'checkbox',
  ].includes(component.type);

  if (!isRecognizedInput) {
    return (
      <div className={`${colClass} p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold flex items-center gap-2`}>
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Renderer unavailable for component type: {component.type}</span>
      </div>
    );
  }

  const formStyle = resolveFormStyle(component as TemplateComponent, theme);

  return (
    <div className={`${colClass} space-y-1.5`}>
      <div className="flex items-center justify-between">
        <label
          className="block text-xs font-bold"
          style={{
            fontFamily: formStyle.labelFontFamily,
            fontSize: formStyle.labelFontSize,
            fontWeight: formStyle.labelFontWeight,
            color: formStyle.labelColor,
          }}
        >
          {label}
          {component.required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {isCalculated && (
          <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
            Calculated
          </span>
        )}
      </div>

      {component.description && mode === 'edit' && (
        <p
          className="text-[11px] leading-snug"
          style={{
            fontFamily: formStyle.captionFontFamily,
            color: formStyle.captionColor,
          }}
        >
          {component.description}
        </p>
      )}

      {mode === 'readOnly' ? (
        <div className="py-1">{renderReadOnlyValue()}</div>
      ) : (
        <>
          {component.type === 'textarea' ? (
            <textarea
              rows={3}
              value={value !== undefined && value !== null ? String(value) : ''}
              onChange={(e) => onChange && onChange(fieldKey, e.target.value)}
              disabled={disabled}
              placeholder={component.placeholder || 'Enter notes...'}
              style={{
                backgroundColor: formStyle.fieldBg,
                borderColor: error ? undefined : formStyle.borderColor,
                borderRadius: formStyle.borderRadius,
              }}
              className={`w-full p-3 text-xs border text-slate-900 focus:outline-none focus:ring-2 ${
                disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
              } ${error ? 'border-rose-300 focus:ring-rose-500/20' : 'focus:ring-indigo-500/20 focus:border-indigo-500'}`}
            />
          ) : component.type === 'select' ? (
            <select
              value={value !== undefined && value !== null ? String(value) : ''}
              onChange={(e) => onChange && onChange(fieldKey, e.target.value)}
              disabled={disabled}
              style={{
                backgroundColor: formStyle.fieldBg,
                borderColor: error ? undefined : formStyle.borderColor,
                borderRadius: formStyle.borderRadius,
              }}
              className={`w-full p-2.5 text-xs border text-slate-900 focus:outline-none cursor-pointer font-medium ${
                disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
              } ${error ? 'border-rose-300 focus:ring-rose-500/20' : 'focus:ring-indigo-500/20 focus:border-indigo-500'}`}
            >
              <option value="">-- Select option --</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : component.type === 'radio' ? (
            <div className="flex items-center gap-3 flex-wrap py-1">
              {options.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
                  style={{
                    fontFamily: formStyle.labelFontFamily,
                    color: formStyle.labelColor,
                  }}
                >
                  <input
                    type="radio"
                    name={fieldKey}
                    value={opt.value}
                    checked={String(value) === String(opt.value)}
                    onChange={(e) => onChange && onChange(fieldKey, e.target.value)}
                    disabled={disabled}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          ) : component.type === 'checkbox' ? (
            <div className="py-1">
              <label
                className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold"
                style={{
                  fontFamily: formStyle.labelFontFamily,
                  color: formStyle.labelColor,
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(value === true || value === 'true' || value === 1)}
                  onChange={(e) => onChange && onChange(fieldKey, e.target.checked)}
                  disabled={disabled}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span>{component.placeholder || label}</span>
              </label>
            </div>
          ) : component.type === 'date' ? (
            <div className="relative flex items-center">
              <input
                type="date"
                min={component.validation?.minDate}
                max={component.validation?.maxDate}
                value={value !== undefined && value !== null ? String(value) : ''}
                onChange={(e) => onChange && onChange(fieldKey, e.target.value)}
                disabled={disabled}
                placeholder={component.placeholder || 'Select date...'}
                style={{
                  backgroundColor: formStyle.fieldBg,
                  borderColor: error ? undefined : formStyle.borderColor,
                  borderRadius: formStyle.borderRadius,
                }}
                className={`w-full p-2.5 pr-9 text-xs border text-slate-900 focus:outline-none ${
                  disabled ? 'bg-slate-100 text-slate-600 font-mono font-bold cursor-not-allowed border-slate-200' : ''
                } ${error ? 'border-rose-300 focus:ring-rose-500/20' : 'focus:ring-indigo-500/20 focus:border-indigo-500'}`}
              />
              <Calendar className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          ) : component.type === 'datetime' ? (
            <div className="relative flex items-center">
              <input
                type="datetime-local"
                min={component.validation?.minDate}
                max={component.validation?.maxDate}
                value={value !== undefined && value !== null ? String(value) : ''}
                onChange={(e) => onChange && onChange(fieldKey, e.target.value)}
                disabled={disabled}
                placeholder={component.placeholder || 'Select date and time...'}
                style={{
                  backgroundColor: formStyle.fieldBg,
                  borderColor: error ? undefined : formStyle.borderColor,
                  borderRadius: formStyle.borderRadius,
                }}
                className={`w-full p-2.5 pr-9 text-xs border text-slate-900 focus:outline-none ${
                  disabled ? 'bg-slate-100 text-slate-600 font-mono font-bold cursor-not-allowed border-slate-200' : ''
                } ${error ? 'border-rose-300 focus:ring-rose-500/20' : 'focus:ring-indigo-500/20 focus:border-indigo-500'}`}
              />
              <Clock className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          ) : (
            <input
              type={component.type === 'number' || component.type === 'currency' || component.type === 'percentage' ? 'number' : 'text'}
              value={value !== undefined && value !== null ? String(value) : ''}
              onChange={(e) => onChange && onChange(fieldKey, e.target.value)}
              disabled={disabled}
              placeholder={component.placeholder || 'Enter value...'}
              style={{
                backgroundColor: formStyle.fieldBg,
                borderColor: error ? undefined : formStyle.borderColor,
                borderRadius: formStyle.borderRadius,
              }}
              className={`w-full p-2.5 text-xs border text-slate-900 focus:outline-none ${
                disabled ? 'bg-slate-100 text-slate-600 font-mono font-bold cursor-not-allowed border-slate-200' : ''
              } ${error ? 'border-rose-300 focus:ring-rose-500/20' : 'focus:ring-indigo-500/20 focus:border-indigo-500'}`}
            />
          )}

          {error && (
            <div className="flex items-center gap-1 text-[11px] text-rose-600 font-medium pt-0.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
