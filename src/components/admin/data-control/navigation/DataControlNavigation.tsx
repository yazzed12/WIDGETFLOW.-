import React from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  KeyRound,
  FileCode2,
  FolderTree,
  BookOpen,
  Package,
  FileSpreadsheet,
  Send,
  PenTool,
  Bell,
  HardDrive,
  History,
  RotateCcw,
  Activity,
  LockKeyhole,
} from 'lucide-react';

export type DataControlDomainKey =
  | 'overview'
  | 'accounts'
  | 'roles'
  | 'permissions'
  | 'templates'
  | 'categories'
  | 'content_library'
  | 'standard_packs'
  | 'reports'
  | 'distribution'
  | 'signatures'
  | 'notifications'
  | 'assets'
  | 'audit'
  | 'workflow_operations'
  | 'system_reset';

interface NavGroup {
  title: string;
  items: Array<{
    key: DataControlDomainKey;
    label: string;
    icon: React.ReactNode;
    summaryKey?: string;
    isProtected?: boolean;
    isAdvanced?: boolean;
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        key: 'overview',
        label: 'System Snapshot',
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
    ],
  },
  {
    title: 'People & Governance',
    items: [
      {
        key: 'accounts',
        label: 'Accounts',
        icon: <Users className="w-4 h-4" />,
        summaryKey: 'accounts',
      },
      {
        key: 'roles',
        label: 'Roles',
        icon: <ShieldCheck className="w-4 h-4" />,
        summaryKey: 'roles',
        isProtected: true,
      },
      {
        key: 'permissions',
        label: 'Permissions',
        icon: <KeyRound className="w-4 h-4" />,
        summaryKey: 'permissions',
        isProtected: true,
      },
    ],
  },
  {
    title: 'Content & Templates',
    items: [
      {
        key: 'templates',
        label: 'Templates',
        icon: <FileCode2 className="w-4 h-4" />,
        summaryKey: 'templates',
      },
      {
        key: 'categories',
        label: 'Categories',
        icon: <FolderTree className="w-4 h-4" />,
        summaryKey: 'categories',
      },
      {
        key: 'content_library',
        label: 'Content Library',
        icon: <BookOpen className="w-4 h-4" />,
        summaryKey: 'content_library',
      },
      {
        key: 'standard_packs',
        label: 'Standard Packs',
        icon: <Package className="w-4 h-4" />,
        summaryKey: 'standard_packs',
      },
    ],
  },
  {
    title: 'Reports & Workflow',
    items: [
      {
        key: 'reports',
        label: 'Reports',
        icon: <FileSpreadsheet className="w-4 h-4" />,
        summaryKey: 'reports',
      },
      {
        key: 'distribution',
        label: 'Distribution',
        icon: <Send className="w-4 h-4" />,
        summaryKey: 'report_assignments',
        isProtected: true,
      },
      {
        key: 'signatures',
        label: 'Signatures',
        icon: <PenTool className="w-4 h-4" />,
        summaryKey: 'signature_data',
        isProtected: true,
      },
    ],
  },
  {
    title: 'Communication',
    items: [
      {
        key: 'notifications',
        label: 'Notifications',
        icon: <Bell className="w-4 h-4" />,
        summaryKey: 'notifications',
      },
    ],
  },
  {
    title: 'Files & Media',
    items: [
      {
        key: 'assets',
        label: 'Assets',
        icon: <HardDrive className="w-4 h-4" />,
        summaryKey: 'assets',
        isProtected: true,
      },
    ],
  },
  {
    title: 'History',
    items: [
      {
        key: 'audit',
        label: 'Audit History',
        icon: <History className="w-4 h-4" />,
        summaryKey: 'audit_data',
        isProtected: true,
      },
      {
        key: 'workflow_operations',
        label: 'Workflow Operations',
        icon: <Activity className="w-4 h-4" />,
        summaryKey: 'workflow_runtime_data',
        isAdvanced: true,
      },
    ],
  },
  {
    title: 'Danger Zone',
    items: [{ key: 'system_reset', label: 'System Reset', icon: <RotateCcw className="w-4 h-4" />, isProtected: true }],
  },
];

interface DataControlNavigationProps {
  activeKey: DataControlDomainKey;
  onSelect: (key: DataControlDomainKey) => void;
  summaryCounts?: Record<string, number>;
}

export const DataControlNavigation: React.FC<DataControlNavigationProps> = ({
  activeKey,
  onSelect,
  summaryCounts = {},
}) => {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200/80 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Data Explorer
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
          Protected Administration
        </p>
      </div>

      <nav className="p-3 space-y-5 flex-1" aria-label="Data Control Navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeKey === item.key;
                const count = item.summaryKey ? summaryCounts[item.summaryKey] : undefined;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelect(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.isProtected && !isActive && (
                        <LockKeyhole className="w-3 h-3 text-amber-500" />
                      )}
                      {count !== undefined && count > 0 && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-purple-700/80 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {count.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};
