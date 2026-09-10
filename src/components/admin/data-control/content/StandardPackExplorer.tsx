import React, { useState } from 'react';
import { Package, Search, ChevronRight, ArrowLeft } from 'lucide-react';
import { BUILT_IN_CONTENT_PACKS } from '../../../../data/builtInContentPacks';
import type { ContentPack } from '../../../../types';
import { StatusPill } from '../common/StatusPill';

export const StandardPackExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPack, setSelectedPack] = useState<ContentPack | null>(null);

  const packs = BUILT_IN_CONTENT_PACKS || [];

  const filteredPacks = packs.filter((pack) => {
    const term = searchTerm.toLowerCase().trim();
    return !term || pack.name.toLowerCase().includes(term) || pack.category.toLowerCase().includes(term);
  });

  if (selectedPack) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <button
          type="button"
          onClick={() => setSelectedPack(null)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Standard Packs</span>
        </button>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-purple-100 text-purple-700">
              <Package className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{selectedPack.name}</h1>
                <StatusPill status={selectedPack.sourceType || 'system'} type="status" />
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">{selectedPack.description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Included Sections &amp; Components ({selectedPack.sections?.length || 0})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedPack.sections?.map((section, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{section.title}</h4>
                    {section.description && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{section.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {section.components?.length || 0} fields
                  </span>
                </div>

                <div className="divide-y divide-slate-50 text-xs">
                  {section.components?.map((comp) => (
                    <div key={comp.id} className="py-2 flex items-center justify-between">
                      <span className="font-medium text-slate-700">{comp.label || comp.key}</span>
                      <span className="font-mono text-[10px] text-slate-400 uppercase">
                        {comp.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-700" />
          <span>Standard Packs Explorer</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Browse built-in pack definitions. Persisted Standard Pack records are managed separately.
        </p>
      </div>

      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search standard packs by name or category…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4 font-bold">Pack Name</th>
              <th className="py-3.5 px-4 font-bold">Category</th>
              <th className="py-3.5 px-4 font-bold">Source</th>
              <th className="py-3.5 px-4 font-bold">Sections</th>
              <th className="py-3.5 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPacks.map((pack) => (
              <tr
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-700 shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 group-hover:text-purple-700 block">
                        {pack.name}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                        {pack.description}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-600 font-medium">{pack.category}</td>
                <td className="py-3.5 px-4">
                  <StatusPill status="Built-in definition" size="sm" />
                </td>
                <td className="py-3.5 px-4 text-slate-600 font-medium">
                  {pack.sections?.length || 0} sections
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900">
                    <span>Inspect</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
