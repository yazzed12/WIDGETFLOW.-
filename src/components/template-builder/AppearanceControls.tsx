import React from 'react';
import type { TemplateComponent } from '../../types';

interface AppearanceControlsProps {
  component: TemplateComponent;
  onUpdate: (component: TemplateComponent) => void;
  disabled?: boolean;
}

const widths = [0, 1, 2, 3, 4] as const;
const radii = [0, 4, 8, 12, 16, 24] as const;
const paddings = [0, 4, 8, 12, 16, 24, 32] as const;

export const AppearanceControls: React.FC<AppearanceControlsProps> = ({ component, onUpdate, disabled = false }) => {
  const appearance = component.appearance || {};
  const update = (changes: Partial<NonNullable<TemplateComponent['appearance']>>) => {
    onUpdate({ ...component, appearance: { ...appearance, ...changes } });
  };
  const reset = () => {
    const next = { ...component };
    delete next.appearance;
    onUpdate(next);
  };

  return (
    <div className="space-y-3 pt-2 border-t border-slate-200">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase">Appearance</h3>
          <p className="mt-1 text-[10px] text-slate-500">Optional styling for this element. Theme remains the default.</p>
        </div>
        <button type="button" onClick={reset} disabled={disabled || !appearance || Object.keys(appearance).length === 0} className="shrink-0 px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 rounded-md transition-colors">
          Reset to Theme
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] font-bold text-slate-600">Background
          <div className="mt-1 flex items-center gap-1.5">
            <input type="color" value={appearance.backgroundColor && appearance.backgroundColor !== 'theme' ? appearance.backgroundColor : '#ffffff'} onChange={(e) => update({ backgroundColor: e.target.value })} disabled={disabled} className="h-8 w-9 rounded border border-slate-200 bg-white p-0.5" aria-label="Element background color" />
            <button type="button" onClick={() => update({ backgroundColor: 'theme' })} disabled={disabled} className="text-[10px] text-slate-500 hover:text-indigo-700">Theme</button>
          </div>
        </label>
        <label className="text-[10px] font-bold text-slate-600">Border color
          <div className="mt-1 flex items-center gap-1.5">
            <input type="color" value={appearance.borderColor && appearance.borderColor !== 'theme' ? appearance.borderColor : '#cbd5e1'} onChange={(e) => update({ borderColor: e.target.value })} disabled={disabled} className="h-8 w-9 rounded border border-slate-200 bg-white p-0.5" aria-label="Element border color" />
            <button type="button" onClick={() => update({ borderColor: 'theme' })} disabled={disabled} className="text-[10px] text-slate-500 hover:text-indigo-700">Theme</button>
          </div>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] font-bold text-slate-600">Border width
          <select value={appearance.borderWidth ?? 0} onChange={(e) => update({ borderWidth: Number(e.target.value) as (typeof widths)[number] })} disabled={disabled} className="mt-1 w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs">
            {widths.map((value) => <option key={value} value={value}>{value}px</option>)}
          </select>
        </label>
        <label className="text-[10px] font-bold text-slate-600">Border style
          <select value={appearance.borderStyle || 'solid'} onChange={(e) => update({ borderStyle: e.target.value as 'solid' | 'dashed' | 'none' })} disabled={disabled} className="mt-1 w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs">
            <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="none">None</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] font-bold text-slate-600">Corner radius
          <select value={appearance.borderRadius ?? 0} onChange={(e) => update({ borderRadius: Number(e.target.value) as (typeof radii)[number] })} disabled={disabled} className="mt-1 w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs">
            {radii.map((value) => <option key={value} value={value}>{value}px</option>)}
          </select>
        </label>
        <label className="text-[10px] font-bold text-slate-600">Inner padding
          <select value={appearance.padding ?? 0} onChange={(e) => update({ padding: Number(e.target.value) as (typeof paddings)[number] })} disabled={disabled} className="mt-1 w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs">
            {paddings.map((value) => <option key={value} value={value}>{value}px</option>)}
          </select>
        </label>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-600 mb-1">Content alignment</label>
        <div className="grid grid-cols-3 gap-1">
          {(['left', 'center', 'right'] as const).map((value) => (
            <button key={value} type="button" onClick={() => update({ textAlign: value })} disabled={disabled} className={`py-1 text-[10px] font-bold capitalize rounded-lg border ${appearance.textAlign === value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}>{value}</button>
          ))}
        </div>
      </div>
    </div>
  );
};
