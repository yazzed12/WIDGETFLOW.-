import React, { useState, useEffect } from 'react';
import type { ContentLibraryItem } from '../../types';
import { configurationService } from '../../features/configuration/services/configurationService';
import {
  BookOpen,
  Search,
  Plus,
  HelpCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { matchesSearch } from '../../features/search/searchMatcher';

interface ContentLibraryPanelProps {
  onInsertContentItem?: (item: ContentLibraryItem) => void;
  onOpenHelp?: (type: string) => void;
}

const CATEGORY_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'All', label: 'All' },
  { id: 'General', label: 'General' },
  { id: 'People / HR', label: 'People / HR' },
  { id: 'Finance', label: 'Finance' },
  { id: 'Operations', label: 'Operations' },
  { id: 'Technology', label: 'Technology' },
  { id: 'Project Management', label: 'Project' },
  { id: 'Compliance / Risk', label: 'Risk' },
];

export const ContentLibraryPanel: React.FC<ContentLibraryPanelProps> = ({
  onInsertContentItem,
  onOpenHelp,
}) => {
  const [items, setItems] = useState<ContentLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const fetchContentItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await configurationService.operationalContentLibrary();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load content library items:', err);
      setError(err.message || 'Unable to load organization content items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContentItems();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesCat && matchesSearch(searchQuery, [item.name, item.contentType, item.contentValue, item.category]);
  });

  return (
    <div className="w-full sm:w-80 bg-slate-50 border-r border-slate-200/90 flex flex-col h-full overflow-y-auto shrink-0 select-none">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Content Library</h2>
              <p className="text-[10px] text-slate-500 font-medium">Reusable organization content blocks</p>
            </div>
          </div>
          {onOpenHelp && (
            <button
              type="button"
              onClick={() => onOpenHelp('content-library')}
              className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
              title="Content Library Quick Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search content items..."
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition-all font-semibold cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content Item List */}
        <div className="space-y-3 pt-1">
          {error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 mx-auto" />
              <p className="text-xs text-rose-900 font-bold">{error}</p>
              <button
                type="button"
                onClick={fetchContentItems}
                className="px-3 py-1 bg-rose-600 text-white font-bold text-[10px] rounded-lg cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="p-6 text-center text-slate-400 text-xs font-medium">Loading content library items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs italic bg-white rounded-2xl border border-slate-200 space-y-1">
              <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1" />
              <p className="font-bold text-slate-600 not-italic">No content items found.</p>
              <p className="text-[10px] text-slate-400">Select another category or clear your search query.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all shadow-2xs space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <span>{item.category}</span>
                      <span>·</span>
                      <span className="font-bold text-slate-600">{item.contentType}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 font-mono bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-3">
                  "{item.contentValue}"
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">Organization block</span>
                  {onInsertContentItem && (
                    <button
                      type="button"
                      onClick={() => onInsertContentItem(item)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3 h-3" /> Insert Content
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
