import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutGrid,
  LayoutDashboard,
  Library,
  FileText,
  CheckSquare,
  FileSpreadsheet,
  Bell,
  ChevronDown,
  ChevronRight,
  Plus,
  DollarSign,
  Users,
  BarChart3,
  Terminal,
  Layers,
  Activity,
  StickyNote,
} from 'lucide-react';
import type { ViewType } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    categories,
    templates,
    getCategoryTemplateCount,
    getTotalCategoryCount,
    getPendingApprovalsForUser,
    getReportsAwaitingMyReview,
    notifications,
    currentUser,
    setSelectedCategory,
    openAddTemplateModal,
    sidebarOpen,
    hasPermission,
  } = useApp();

  // Track expanded category IDs
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'cat-finance': true,
    'cat-hr': false,
    'cat-analytics': false,
    'cat-devtools': false,
  });

  const toggleCategory = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'DollarSign':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'Users':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'BarChart3':
        return <BarChart3 className="w-4 h-4 text-purple-500" />;
      case 'Terminal':
        return <Terminal className="w-4 h-4 text-amber-500" />;
      default:
        return <Layers className="w-4 h-4 text-indigo-500" />;
    }
  };

  const pendingApprovalsCount = getPendingApprovalsForUser().length;
  const reportsAwaitingReviewCount = getReportsAwaitingMyReview().length;
  const unreadNotifCount = notifications.filter(
    (n) => n.userId === currentUser.id && !n.read
  ).length;

  const rawNavItems: Array<{ id: ViewType; label: string; icon: React.ReactNode; badge?: number; visible?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'templates', label: 'Report Templates', icon: <Library className="w-4 h-4" />, visible: hasPermission('templates.view_approved') },
    { id: 'my-requests', label: 'My Requests', icon: <FileText className="w-4 h-4" />, visible: hasPermission('templates.create') || hasPermission('templates.edit_own_draft') },
    {
      id: 'approvals',
      label: 'Template Approvals',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      visible: hasPermission('template_approvals.view'),
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badge: reportsAwaitingReviewCount > 0 ? reportsAwaitingReviewCount : undefined,
      visible: hasPermission('reports.view_own') || hasPermission('reports.view_received') || hasPermission('reports.create'),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
      visible: hasPermission('notifications.view'),
    },
    {
      id: 'organization-activity',
      label: 'Organization Activity',
      icon: <Activity className="w-4 h-4" />,
      visible: hasPermission('audit_history.view'),
    },
    { id: 'sticky-notes', label: 'Sticky Notes', icon: <StickyNote className="w-4 h-4" /> },
  ];

  const navItems = rawNavItems.filter((item) => {
    return item.visible !== false;
  });

  const handleAddTemplateClick = () => {
    openAddTemplateModal();
  };

  if (!sidebarOpen) return null;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-tight leading-none">WidgetFlow</h1>
          </div>
        </div>
        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
          Demo
        </span>
      </div>

      {/* Primary Action Button */}
      {hasPermission('templates.create') && hasPermission('studio.access') && <div className="p-4 border-b border-slate-800">
        <button
          onClick={handleAddTemplateClick}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Template</span>
        </button>
      </div>}

      {/* Sidebar Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {hasPermission('templates.view_approved') && <div>
          <div className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    if (item.id === 'templates') {
                      setSelectedCategory(null);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white text-indigo-700' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>}

        {/* Collapsible Categories Section */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Categories</span>
            <span className="text-[10px] text-slate-500">{getTotalCategoryCount()} total</span>
          </div>

          <div className="space-y-1">
            {categories.map((cat) => {
              const approvedCount = getCategoryTemplateCount(cat.id);
              const isExpanded = expandedCategories[cat.id] ?? false;
              const catTemplates = templates.filter(
                (t) => t.categoryId === cat.id && t.status === 'Approved'
              );

              return (
                <div key={cat.id} className="rounded-lg overflow-hidden">
                  <div
                    onClick={(e) => {
                      setActiveView('templates');
                      setSelectedCategory(cat.id);
                      toggleCategory(cat.id, e);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getCategoryIcon(cat.iconName)}
                      <span className="truncate">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {approvedCount}
                      </span>
                      <button
                        onClick={(e) => toggleCategory(cat.id, e)}
                        className="text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Sub-templates list */}
                  {isExpanded && (
                    <div className="ml-7 my-1 pl-2 border-l border-slate-800 space-y-1">
                      {catTemplates.length === 0 ? (
                        <div className="px-2 py-1 text-[11px] text-slate-500 italic">No approved templates</div>
                      ) : (
                        catTemplates.map((tpl) => (
                          <button
                            key={tpl.id}
                            onClick={() => {
                              setActiveView('templates');
                              setSelectedCategory(cat.id);
                            }}
                            className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60 truncate transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate">{tpl.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
