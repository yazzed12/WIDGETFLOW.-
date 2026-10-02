import React, { useState } from 'react';
import type { TemplateTheme } from '../../types';
import { SAFE_FONT_FAMILIES, DEFAULT_THEME_TOKENS, resolveEffectiveTheme } from '../../shared/themeResolver';
import { Palette, RefreshCw, Eye, Check } from 'lucide-react';

interface StudioThemePanelProps {
  theme?: TemplateTheme;
  onUpdateTheme: (themeUpdates: Partial<TemplateTheme>) => void;
  onResetTheme?: () => void;
}

export const StudioThemePanel: React.FC<StudioThemePanelProps> = ({
  theme,
  onUpdateTheme,
  onResetTheme,
}) => {
  const effTheme = resolveEffectiveTheme(theme);
  const [activeSection, setActiveSection] = useState<'brand' | 'typography' | 'colors' | 'form' | 'table' | 'spacing'>('brand');

  const handlePresetSelect = (presetKey: 'clean' | 'corporate' | 'executive' | 'minimal') => {
    const baseline = DEFAULT_THEME_TOKENS[presetKey];
    onUpdateTheme({
      ...baseline,
      preset: presetKey,
    });
  };

  return (
    <div className="p-4 space-y-5 text-slate-800">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
            <Palette className="w-4 h-4 text-indigo-600" />
            <h2>Global Design System (Themes)</h2>
          </div>
          {onResetTheme && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset global Theme to default baseline tokens? Component local overrides will remain intact.')) {
                  onResetTheme();
                }
              }}
              title="Reset theme to baseline defaults"
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500 leading-normal">
          Set global visual defaults across your report template. Components dynamically inherit these tokens unless locally overridden.
        </p>
      </div>

      {/* Preset Selector Badges */}
      <div>
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Baseline Theme Presets</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'clean', label: 'Clean Light', color: 'bg-indigo-600' },
            { id: 'corporate', label: 'Corporate Navy', color: 'bg-blue-900' },
            { id: 'executive', label: 'Executive Emerald', color: 'bg-emerald-700' },
            { id: 'minimal', label: 'Minimal Mono', color: 'bg-slate-900' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetSelect(p.id as any)}
              className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                effTheme.preset === p.id
                  ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-2xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${p.color} shrink-0`} />
                <span className="text-xs font-bold text-slate-800">{p.label}</span>
              </div>
              {effTheme.preset === p.id && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-1 overflow-x-auto">
        {[
          { id: 'brand', label: 'Brand' },
          { id: 'typography', label: 'Typography' },
          { id: 'colors', label: 'Colors' },
          { id: 'form', label: 'Form' },
          { id: 'table', label: 'Table' },
          { id: 'spacing', label: 'Spacing' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeSection === tab.id
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-Panel 1: BRAND */}
      {activeSection === 'brand' && (
        <div className="space-y-4 bg-white p-3.5 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Primary Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={effTheme.primaryColor}
                onChange={(e) => onUpdateTheme({ primaryColor: e.target.value })}
                className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0 bg-transparent"
              />
              <input
                type="text"
                value={effTheme.primaryColor}
                onChange={(e) => onUpdateTheme({ primaryColor: e.target.value })}
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400">Secondary and accent tokens remain available for future supported report consumers.</p>
        </div>
      )}

      {/* Sub-Panel 2: TYPOGRAPHY */}
      {activeSection === 'typography' && (
        <div className="space-y-4 bg-white p-3.5 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Body Font Family</label>
            <select
              value={effTheme.bodyFont}
              onChange={(e) => onUpdateTheme({ bodyFont: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {SAFE_FONT_FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Heading Font Family</label>
            <select
              value={effTheme.headingFont}
              onChange={(e) => onUpdateTheme({ headingFont: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {SAFE_FONT_FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Heading Levels (H1 / H2 / H3)</h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">H1 Main Title Color</label>
              <input
                type="color"
                value={effTheme.typography.h1?.fontColor || effTheme.primaryColor}
                onChange={(e) =>
                  onUpdateTheme({
                    typography: {
                      ...effTheme.typography,
                      h1: { ...(effTheme.typography.h1 || { fontFamily: effTheme.headingFont, fontSize: '28px', fontWeight: '800', fontColor: effTheme.primaryColor }), fontColor: e.target.value },
                    },
                  })
                }
                className="w-full h-7 rounded-lg border border-slate-200 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">H2 Section Header Color</label>
              <input
                type="color"
                value={effTheme.typography.h2?.fontColor || effTheme.textPrimaryColor}
                onChange={(e) =>
                  onUpdateTheme({
                    typography: {
                      ...effTheme.typography,
                      h2: { ...(effTheme.typography.h2 || { fontFamily: effTheme.headingFont, fontSize: '22px', fontWeight: '700', fontColor: effTheme.textPrimaryColor }), fontColor: e.target.value },
                    },
                  })
                }
                className="w-full h-7 rounded-lg border border-slate-200 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Panel 3: COLOR PALETTE */}
      {activeSection === 'colors' && (
        <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
          {[
            { key: 'textPrimaryColor', label: 'Text Primary' },
            { key: 'textSecondaryColor', label: 'Text Secondary' },
            { key: 'textMutedColor', label: 'Muted Text' },
            { key: 'bgColor', label: 'Background Color' },
            { key: 'surfaceColor', label: 'Surface Color' },
            { key: 'borderColor', label: 'Border Color' },
            { key: 'infoColor', label: 'Info Banner' },
            { key: 'successColor', label: 'Success Banner' },
            { key: 'warningColor', label: 'Warning Banner' },
            { key: 'dangerColor', label: 'Danger / Error' },
          ].map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700">{c.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(effTheme as any)[c.key] || '#000000'}
                  onChange={(e) => onUpdateTheme({ [c.key]: e.target.value })}
                  className="w-6 h-6 rounded-md border border-slate-200 cursor-pointer p-0 bg-transparent"
                />
                <span className="text-[10px] font-mono text-slate-500 w-16 text-right">
                  {(effTheme as any)[c.key]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-Panel 4: FORM STYLES */}
      {activeSection === 'form' && (
        <div className="space-y-4 bg-white p-3.5 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-bold text-slate-600">Field Background
              <input type="color" value={effTheme.formStyles.fieldBg} onChange={(e) => onUpdateTheme({ formStyles: { ...effTheme.formStyles, fieldBg: e.target.value } })} className="mt-1 w-full h-8 rounded-lg border border-slate-200 cursor-pointer" />
            </label>
            <label className="text-[10px] font-bold text-slate-600">Field Border
              <input type="color" value={effTheme.formStyles.borderColor} onChange={(e) => onUpdateTheme({ formStyles: { ...effTheme.formStyles, borderColor: e.target.value } })} className="mt-1 w-full h-8 rounded-lg border border-slate-200 cursor-pointer" />
            </label>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Field Border Radius</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'square', label: 'Square' },
                { id: 'small', label: 'Small' },
                { id: 'medium', label: 'Medium' },
                { id: 'rounded', label: 'Rounded' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    onUpdateTheme({
                      formStyles: { ...effTheme.formStyles, borderRadius: r.id as any },
                    })
                  }
                  className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border text-center transition-colors cursor-pointer ${
                    effTheme.formStyles.borderRadius === r.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Input Field Density</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'compact', label: 'Compact' },
                { id: 'standard', label: 'Standard' },
                { id: 'comfortable', label: 'Comfortable' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() =>
                    onUpdateTheme({
                      formStyles: { ...effTheme.formStyles, density: d.id as any },
                      density: d.id === 'compact' ? 'compact' : 'comfortable',
                    })
                  }
                  className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border text-center transition-colors cursor-pointer ${
                    effTheme.formStyles.density === d.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Panel 5: TABLE STYLES */}
      {activeSection === 'table' && (
        <div className="space-y-4 bg-white p-3.5 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Table Header Background</label>
            <input
              type="color"
              value={effTheme.tableStyles.headerBg}
              onChange={(e) =>
                onUpdateTheme({
                  tableStyles: { ...effTheme.tableStyles, headerBg: e.target.value },
                })
              }
              className="w-full h-8 rounded-lg border border-slate-200 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Table Header Text Color</label>
            <input
              type="color"
              value={effTheme.tableStyles.headerTextColor}
              onChange={(e) =>
                onUpdateTheme({
                  tableStyles: { ...effTheme.tableStyles, headerTextColor: e.target.value },
                })
              }
              className="w-full h-8 rounded-lg border border-slate-200 cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-bold text-slate-600">Table Border
              <input type="color" value={effTheme.tableStyles.borderColor} onChange={(e) => onUpdateTheme({ tableStyles: { ...effTheme.tableStyles, borderColor: e.target.value } })} className="mt-1 w-full h-8 rounded-lg border border-slate-200 cursor-pointer" />
            </label>
            <label className="text-[10px] font-bold text-slate-600">Table Density
              <select value={effTheme.tableStyles.density} onChange={(e) => onUpdateTheme({ tableStyles: { ...effTheme.tableStyles, density: e.target.value as any } })} className="mt-1 w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <option value="compact">Compact</option><option value="standard">Standard</option><option value="comfortable">Comfortable</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {/* Sub-Panel 6: SPACING */}
      {activeSection === 'spacing' && (
        <div className="space-y-4 bg-white p-3.5 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Section Gap</label>
            <div className="grid grid-cols-3 gap-1">
              {['compact', 'standard', 'spacious'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    onUpdateTheme({
                      documentSpacing: { ...effTheme.documentSpacing, sectionGap: g as any },
                    })
                  }
                  className={`py-1.5 px-2 text-[10px] font-bold capitalize rounded-lg border text-center transition-colors cursor-pointer ${
                    effTheme.documentSpacing.sectionGap === g
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Component Gap</label>
            <div className="grid grid-cols-3 gap-1">
              {['compact', 'standard', 'spacious'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    onUpdateTheme({
                      documentSpacing: { ...effTheme.documentSpacing, componentGap: g as any },
                    })
                  }
                  className={`py-1.5 px-2 text-[10px] font-bold capitalize rounded-lg border text-center transition-colors cursor-pointer ${
                    effTheme.documentSpacing.componentGap === g
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Page Padding</label>
            <div className="grid grid-cols-3 gap-1">
              {['compact', 'standard', 'spacious'].map((padding) => (
                <button key={padding} type="button" onClick={() => onUpdateTheme({ documentSpacing: { ...effTheme.documentSpacing, pagePadding: padding as any } })} className={`py-1.5 px-2 text-[10px] font-bold capitalize rounded-lg border ${effTheme.documentSpacing.pagePadding === padding ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{padding}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Box */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          <span>Live Theme Preview</span>
        </div>

        <div
          className="p-4 rounded-xl border space-y-3 transition-all"
          style={{
            backgroundColor: effTheme.surfaceColor,
            borderColor: effTheme.borderColor,
            fontFamily: effTheme.bodyFont,
          }}
        >
          <h3
            className="font-bold text-lg"
            style={{
              color: effTheme.typography.h1?.fontColor || effTheme.primaryColor,
              fontFamily: effTheme.headingFont,
            }}
          >
            Sample Section Heading
          </h3>
          <p className="text-xs" style={{ color: effTheme.textSecondaryColor }}>
            This live card demonstrates real-time global Theme tokens applied across headings, text inputs, and table headers.
          </p>

          <div className="space-y-1">
            <span className="text-[10px] font-bold" style={{ color: effTheme.textPrimaryColor }}>
              Sample Field Label
            </span>
            <input
              type="text"
              readOnly
              value="Sample input text"
              className="w-full px-3 py-1.5 text-xs border rounded-lg"
              style={{
                backgroundColor: effTheme.formStyles.fieldBg,
                borderColor: effTheme.formStyles.borderColor,
                color: effTheme.textPrimaryColor,
                borderRadius:
                  effTheme.formStyles.borderRadius === 'rounded'
                    ? '16px'
                    : effTheme.formStyles.borderRadius === 'medium'
                    ? '8px'
                    : effTheme.formStyles.borderRadius === 'small'
                    ? '4px'
                    : '0px',
              }}
            />
          </div>

          <div
            className="p-2.5 rounded-lg border text-xs font-medium"
            style={{
              backgroundColor: `${effTheme.infoColor}15`,
              borderColor: `${effTheme.infoColor}40`,
              color: effTheme.infoColor,
            }}
          >
            Info Banner sample using Theme tokens.
          </div>
        </div>
      </div>
    </div>
  );
};
