import React, { useState } from 'react';
import { FolderTree, FileCode2, ChevronRight, X } from 'lucide-react';
import type { Category, WidgetTemplate } from '../../../../types';
import { StatusPill } from '../common/StatusPill';

interface CategoryExplorerProps {
  categories: Category[];
  templates?: WidgetTemplate[];
  onNavigateToTemplate?: (templateId: string) => void;
}

export const CategoryExplorer: React.FC<CategoryExplorerProps> = ({
  categories,
  templates = [],
  onNavigateToTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const categoryTemplates = selectedCategory
    ? templates.filter((t) => t.categoryId === selectedCategory.id)
    : [];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <FolderTree className="w-5 h-5 text-purple-700" />
          <span>Categories Explorer</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Inspect organizational categories, linked templates, and template taxonomy.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4 font-bold">Category Name</th>
              <th className="py-3.5 px-4 font-bold">Description</th>
              <th className="py-3.5 px-4 font-bold">Status</th>
              <th className="py-3.5 px-4 font-bold">Templates Using Category</th>
              <th className="py-3.5 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((cat) => {
              const count = templates.filter((t) => t.categoryId === cat.id).length;
              return (
                <tr
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-50 text-purple-700 shrink-0">
                        <FolderTree className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 group-hover:text-purple-700">
                        {cat.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                    {cat.description || 'General organizational category'}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusPill status={(cat as any).status || 'Active'} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold">
                      {count} template{count === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900">
                      <span>View Templates</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Category Detail Drawer */}
      {selectedCategory && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-30 overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">{selectedCategory.name}</h3>
                <p className="text-xs text-slate-400">Category Details</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
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
              <p className="text-slate-700 leading-relaxed">
                {selectedCategory.description || 'No description provided.'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Templates In This Category ({categoryTemplates.length})
              </span>
              {categoryTemplates.length === 0 ? (
                <p className="text-slate-400 italic">No templates assigned to this category.</p>
              ) : (
                <div className="space-y-2">
                  {categoryTemplates.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedCategory(null);
                        if (onNavigateToTemplate) onNavigateToTemplate(t.id);
                      }}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileCode2 className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="font-bold text-slate-900 truncate">{t.name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
