import React from 'react';
import { Database, Search, ChevronRight, X } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface DataControlHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  supportsSearch?: boolean;
  onClearSearch?: () => void;
  actionNode?: React.ReactNode;
}

export const DataControlHeader: React.FC<DataControlHeaderProps> = ({
  breadcrumbs,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search in current view…',
  supportsSearch = true,
  onClearSearch,
  actionNode,
}) => {
  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
      {/* Breadcrumb path */}
      <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
        <div className="p-2 rounded-xl bg-purple-100 text-purple-700 shrink-0">
          <Database className="w-4 h-4" />
        </div>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-medium whitespace-nowrap">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                {isLast || !item.onClick ? (
                  <span className={`truncate max-w-xs ${isLast ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="text-slate-500 hover:text-purple-700 transition-colors cursor-pointer truncate max-w-xs"
                  >
                    {item.label}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right controls: Search & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {supportsSearch && (
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8.5 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500 transition-all"
            />
            {searchTerm && onClearSearch && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {actionNode}
      </div>
    </header>
  );
};
