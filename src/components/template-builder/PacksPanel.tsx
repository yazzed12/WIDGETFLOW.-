import React, { useState, useEffect } from 'react';
import { configurationService } from '../../features/configuration/services/configurationService';
import type { AdminPack } from '../../types';
import { Package, Search, Plus, Eye, AlertTriangle, X } from 'lucide-react';
import { matchesSearch } from '../../features/search/searchMatcher';

interface PacksPanelProps {
  onInsertAdminPack: (pack: AdminPack) => void;
  onOpenHelp?: (type: string) => void;
}

export const PacksPanel: React.FC<PacksPanelProps> = ({ onInsertAdminPack }) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'my-packs'>('standard');
  const [standardPacks, setStandardPacks] = useState<AdminPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [previewPack, setPreviewPack] = useState<AdminPack | null>(null);

  const fetchPacks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await configurationService.packs();
      setStandardPacks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load standard packs:', err);
      setError(err.message || 'Unable to load building block packs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacks();
  }, []);

  const categories = ['All', ...Array.from(new Set(standardPacks.map((p) => p.categoryName || 'General').filter(Boolean)))];

  const filteredStandardPacks = standardPacks.filter((pack) => {
    const matchesCat = selectedCategory === 'All' || (pack.categoryName || 'General') === selectedCategory;
    return matchesCat && matchesSearch(searchTerm, [pack.name, pack.description, pack.categoryName]);
  });

  return (
    <div className="p-4 space-y-4 animate-fade-in select-none">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Packs</h2>
        </div>
        <p className="text-[11px] text-slate-500 leading-normal">
          Predefined bundles of building blocks prepared for report templates.
        </p>
      </div>

      {/* Two Tab Concept: Standard Packs vs My Packs */}
      <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-[11px] font-semibold text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab('standard')}
          className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
            activeTab === 'standard' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900'
          }`}
        >
          <span>Standard Packs</span>
          <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full">
            {standardPacks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my-packs')}
          className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
            activeTab === 'my-packs' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900'
          }`}
        >
          <span>My Packs</span>
          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">
            0
          </span>
        </button>
      </div>

      {/* Search & Category Filter */}
      {activeTab === 'standard' && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search standard packs..."
              className="w-full pl-8 pr-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
            />
          </div>

          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    selectedCategory === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'standard' ? (
        error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 mx-auto" />
            <p className="text-xs text-rose-900 font-bold">{error}</p>
            <button
              type="button"
              onClick={fetchPacks}
              className="px-3 py-1 bg-rose-600 text-white font-bold text-[10px] rounded-lg cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading Standard Packs...</div>
        ) : filteredStandardPacks.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
            No Standard Packs available.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStandardPacks.map((pack) => (
              <div
                key={pack.id}
                className="p-3.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-xs space-y-2.5 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {pack.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {pack.categoryName || 'General'} · {pack.items.length} items
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewPack(pack)}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg cursor-pointer"
                    title="Preview Items"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-medium">
                  {pack.description}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-mono text-slate-400">Admin Pack</span>
                  <button
                    type="button"
                    onClick={() => onInsertAdminPack(pack)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insert Pack</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-1.5">
          <Package className="w-6 h-6 text-slate-300 mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-700">No personal packs created yet.</p>
          <p className="text-[10px] text-slate-400 leading-normal">
            Custom building block bundles created by you will appear under My Packs.
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {previewPack && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-extrabold text-slate-900">{previewPack.name}</h3>
              </div>
              <button
                onClick={() => setPreviewPack(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600">{previewPack.description}</p>
              <div className="space-y-1 pt-2">
                <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Pack Building Blocks</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {previewPack.items.map((item, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                      <span className="font-bold text-slate-800">{item.label}</span>
                      <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.5 bg-slate-200 rounded font-mono">
                        {item.sourceType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setPreviewPack(null)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onInsertAdminPack(previewPack);
                  setPreviewPack(null);
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Insert Pack
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
