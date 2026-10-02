import React, { useState, useEffect } from 'react';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { configurationService } from '../../features/configuration/services/configurationService';
import { AdminInfoTooltip } from './AdminInfoTooltip';
import {
  LayoutTemplate,
  Shapes,
  Package,
  Type,
  Layers,
  Database,
  Palette,
  GitMerge,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'studio.templates': <LayoutTemplate className="w-5 h-5 text-indigo-600" />,
  'studio.elements': <Shapes className="w-5 h-5 text-purple-600" />,
  'studio.content_library': <Package className="w-5 h-5 text-blue-600" />,
  'studio.text': <Type className="w-5 h-5 text-amber-600" />,
  'studio.sections': <Layers className="w-5 h-5 text-emerald-600" />,
  'studio.data_fields': <Database className="w-5 h-5 text-rose-600" />,
  'studio.themes': <Palette className="w-5 h-5 text-pink-600" />,
  'studio.workflow': <GitMerge className="w-5 h-5 text-indigo-600" />,
};

export const AdminFeatureManagement: React.FC<{ onManageInsightsAccess?: () => void }> = ({ onManageInsightsAccess }) => {
  const { updateFeature } = useSystemConfig();
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await configurationService.features();
      setFeatures(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch admin features:', err);
      setError(err.message || 'Unable to load feature configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleToggle = async (featureKey: string, currentEnabled: boolean) => {
    try {
      const newEnabled = !currentEnabled;
      await updateFeature(featureKey, newEnabled);
      setFeatures((prev) =>
        prev.map((f) => ((f.feature_key === featureKey || f.featureKey === featureKey) ? { ...f, enabled: newEnabled } : f))
      );
      const feat = features.find((f) => f.feature_key === featureKey || f.featureKey === featureKey);
      const name = feat?.feature_name || feat?.name || featureKey;
      setToastMessage(`${name} ${newEnabled ? 'enabled' : 'disabled'} for all company users`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update feature setting');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-black tracking-tight text-slate-900">Studio Feature Management</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium pt-1">
            Enable or disable Template Studio navigation modules firm-wide. Disabling a feature removes it for all Employees, Managers, and Directors.
          </p>
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <p className="text-sm font-bold text-rose-900">{error}</p>
          <button
            onClick={fetchFeatures}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Retry Loading Features
          </button>
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading platform features...</div>
      ) : features.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
          No feature settings are configured.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feat) => {
            const icon = FEATURE_ICONS[feat.feature_key] || <Sliders className="w-5 h-5 text-purple-600" />;
            const isEnabled = Boolean(feat.enabled);

            return (
              <div
                key={feat.feature_key}
                className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  isEnabled ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50/80 border-slate-200/80 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-slate-100 rounded-xl shrink-0">
                    {icon}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">{feat.feature_name}</h3>
                      <AdminInfoTooltip
                        title={feat.feature_name}
                        description={feat.description || `Controls operational availability of ${feat.feature_name}.`}
                        whoItAffects="All operational users (Employees, Managers, Directors)."
                        impact="Disabling this feature removes it from operational users while keeping it available to Admin for management and reactivation."
                      />
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isEnabled
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {feat.description}
                    </p>
                    <div className="text-[10px] font-mono text-slate-400 pt-1">
                      Key: {feat.feature_key}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                {feat.feature_key === 'insights' && <button type="button" onClick={onManageInsightsAccess} className="whitespace-nowrap rounded-lg border border-indigo-200 bg-white px-3 py-2 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">Manage Access</button>}
                {/* Existing global feature toggle remains independent of per-role/user access. */}
                <button
                  type="button"
                  onClick={() => handleToggle(feat.feature_key, isEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                    isEnabled ? 'bg-purple-600' : 'bg-slate-300'
                  }`}
                  title={isEnabled ? `Disable ${feat.feature_name}` : `Enable ${feat.feature_name}`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform block ${
                      isEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
