import React from 'react';
import {
  LayoutDashboard,
  Sliders,
  LayoutTemplate,
  Package,
  Shapes,
  BookOpen,
  Users,
  FolderKanban,
  Settings,
  History,
  ShieldCheck,
  Database,
} from 'lucide-react';
import type { AdminViewType } from '../../types';

interface AdminSidebarProps {
  activeTab: AdminViewType;
  onSelectTab: (tab: AdminViewType) => void;
}

const ADMIN_NAV_ITEMS: Array<{ id: AdminViewType; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'data-control', label: 'Data Control Center', icon: <Database className="w-4 h-4" /> },
  { id: 'features', label: 'Feature Management', icon: <Sliders className="w-4 h-4" /> },
  { id: 'studio-config', label: 'Template Studio Configuration', icon: <LayoutTemplate className="w-4 h-4" /> },
  { id: 'packs', label: 'Pack Management', icon: <Package className="w-4 h-4" /> },
  { id: 'elements', label: 'Element Management', icon: <Shapes className="w-4 h-4" /> },
  { id: 'content-library', label: 'Content Library Management', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'users', label: 'Users & Access', icon: <Users className="w-4 h-4" /> },
  { id: 'roles', label: 'Roles & Permissions', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'categories', label: 'Categories', icon: <FolderKanban className="w-4 h-4" /> },
  { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4" /> },
  { id: 'audit', label: 'Audit Log', icon: <History className="w-4 h-4" /> },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col h-full border-r border-slate-800/80 shrink-0 select-none">
      <div className="p-4 space-y-1">
        <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Admin Administration
        </span>
        <nav className="space-y-1 pt-2">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className={isActive ? 'text-white' : 'text-purple-400'}>{item.icon}</div>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
