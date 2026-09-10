import React, { useEffect, useState } from 'react';
import { ShieldCheck, ChevronRight, X } from 'lucide-react';
import { StatusPill } from '../common/StatusPill';
import { ProtectedDataNotice } from '../common/ProtectedDataNotice';
import { adminService } from '../../../../features/admin/services/adminService';
import type { OrganizationalRole } from '../../../../types';

interface RoleExplorerProps {
  users?: Array<{ id: string; name?: string; full_name?: string; role?: string; role_name?: string }>;
  onNavigateToRolesManagement?: () => void;
  onNavigateToUser?: (userId: string) => void;
}

interface RoleData {
  id: string;
  name: string;
  key: string;
  type: 'system' | 'custom';
  description: string;
  governanceLevel: string;
  isActive: boolean;
  isProtected: boolean;
  assignedUsers: number;
}

export const RoleExplorer: React.FC<RoleExplorerProps> = ({
  users = [],
  onNavigateToUser,
}) => {
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
  const [roles, setRoles] = useState<OrganizationalRole[]>([]);
  useEffect(() => { adminService.roleCatalog().then((catalog) => setRoles(catalog.roles)).catch(() => setRoles([])); }, []);

  const getRoleUsers = (roleKey: string, roleName: string) => {
    return users.filter((u) => {
      const r = (u.role_name || u.role || '').toLowerCase();
      return r === roleKey.toLowerCase() || r === roleName.toLowerCase();
    });
  };

  const liveRoles: RoleData[] = roles.map((role) => ({ id: role.id, name: role.name, key: role.key, type: role.roleType === 'Custom' ? 'custom' : 'system', description: role.description || 'Organizational access role.', governanceLevel: role.governanceLevel || 'Not specified', isActive: role.isActive, isProtected: role.isProtected, assignedUsers: role.assignedUsers }));

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-700" />
          <span>Roles Governance Inspector</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Read-only inspection of organizational roles, access tier boundaries, and assigned members.
        </p>
      </div>

      <ProtectedDataNotice
        title="Protected Governance Domain"
        description="System roles are protected from deletion because they are required for access control and authentication governance."
        reason="access_control"
      />

      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4 font-bold">Role Name</th>
              <th className="py-3.5 px-4 font-bold">Type</th>
              <th className="py-3.5 px-4 font-bold">Assigned Users</th>
              <th className="py-3.5 px-4 font-bold">Governance Level</th>
              <th className="py-3.5 px-4 font-bold">Protection</th>
              <th className="py-3.5 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {liveRoles.map((role) => {
              return (
                <tr
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-50 text-purple-700 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 group-hover:text-purple-700 block">
                          {role.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono block">
                          {role.key}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusPill status={role.type} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold">
                      {role.assignedUsers} user{role.assignedUsers === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {role.governanceLevel}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusPill status={role.isProtected ? 'protected' : 'unprotected'} type="protection" size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900">
                      <span>Inspect</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Role Detail Drawer */}
      {selectedRole && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-30 overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">{selectedRole.name}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedRole.key}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <ProtectedDataNotice
              compact
              reason="access_control"
              description="Protected: This system role is protected from deletion because it is required for access control."
            />

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Description
              </span>
              <p className="text-slate-700 leading-relaxed">{selectedRole.description}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Governance Level</span>
                <span className="font-bold text-slate-800">{selectedRole.governanceLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Status</span>
                <span className={selectedRole.isActive ? 'font-bold text-emerald-700' : 'font-bold text-slate-500'}>{selectedRole.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Assigned Accounts ({getRoleUsers(selectedRole.key, selectedRole.name).length})
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {getRoleUsers(selectedRole.key, selectedRole.name).map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setSelectedRole(null);
                      if (onNavigateToUser) onNavigateToUser(u.id);
                    }}
                    className="p-3 rounded-2xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-900">{u.full_name || u.name}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
