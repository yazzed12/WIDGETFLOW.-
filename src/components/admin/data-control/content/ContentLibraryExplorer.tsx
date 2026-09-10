import React, { useState } from 'react';
import { BookOpen, Search, Info, ExternalLink, ChevronRight, X } from 'lucide-react';
import { StatusPill } from '../common/StatusPill';

interface ContentLibraryExplorerProps {
  onNavigateToContentManagement?: () => void;
}

interface LibraryItem {
  id: string;
  name: string;
  type: string;
  category: string;
  status: string;
  usageCount: number;
  description: string;
}

export const ContentLibraryExplorer: React.FC<ContentLibraryExplorerProps> = ({
  onNavigateToContentManagement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);

  const filtered: LibraryItem[] = [];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-700" />
          <span>Content Library Explorer</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Inspect reusable shared components, pre-configured form sections, and global building blocks.
        </p>
      </div>

      {/* Integration Status Notice */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Live records unavailable</p>
          <p className="text-indigo-800 leading-relaxed text-[11px]">
            The current Data Control read contract does not expose persisted Content Library records. No sample records are shown here. Use Content Library Management for supported administration.
          </p>
        </div>
        {onNavigateToContentManagement && (
          <button
            type="button"
            onClick={onNavigateToContentManagement}
            className="ml-auto shrink-0 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Open Management</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search content library components…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500"
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4 font-bold">Element Name</th>
              <th className="py-3.5 px-4 font-bold">Type</th>
              <th className="py-3.5 px-4 font-bold">Category</th>
              <th className="py-3.5 px-4 font-bold">Status</th>
              <th className="py-3.5 px-4 font-bold">Template Usage</th>
              <th className="py-3.5 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 px-4 text-center text-xs text-slate-500">
                  Persisted content library records are not available from the current read contract.
                </td>
              </tr>
            ) : filtered.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-purple-700">
                  {item.name}
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-600">{item.type}</td>
                <td className="py-3.5 px-4 text-slate-600">{item.category}</td>
                <td className="py-3.5 px-4">
                  <StatusPill status={item.status} size="sm" />
                </td>
                <td className="py-3.5 px-4 text-slate-600 font-medium">
                  {item.usageCount} templates
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

      {/* Drawer */}
      {selectedItem && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-30 overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">{selectedItem.name}</h3>
                <p className="text-xs text-slate-400">{selectedItem.type}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Description
              </span>
              <p className="text-slate-700 leading-relaxed">{selectedItem.description}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Category</span>
                <span className="font-bold text-slate-800">{selectedItem.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Element Type</span>
                <span className="font-bold text-slate-800">{selectedItem.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Active In</span>
                <span className="font-bold text-slate-800">{selectedItem.usageCount} templates</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
