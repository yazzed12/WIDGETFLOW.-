import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { StatusPill } from '../common/StatusPill';
import { EmptyState } from '../common/EmptyState';

export interface AccountRecord {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
  role_name?: string;
  role_key?: string;
  role?: string;
  status?: string;
  profile_code?: string;
  department?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface AccountExplorerProps {
  accounts: AccountRecord[];
  isLoading?: boolean;
  selectedAccountId?: string | null;
  onSelectAccount: (account: AccountRecord) => void;
  onSelectForCleanup?: (accountId: string) => void;
  selectedForCleanup?: string[];
  page?: number; totalCount?: number; pageSize?: number; onPageChange?: (page: number) => void;
}

export const AccountExplorer: React.FC<AccountExplorerProps> = ({
  accounts,
  isLoading = false,
  onSelectAccount,
  onSelectForCleanup,
  selectedForCleanup = [],
  page = 1, totalCount = accounts.length, pageSize = 25, onPageChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    accounts.forEach((a) => {
      const r = a.role_name || a.role || a.role_key;
      if (r) roles.add(String(r));
    });
    return Array.from(roles);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const name = (account.full_name || account.name || '').toLowerCase();
      const email = (account.email || '').toLowerCase();
      const code = (account.profile_code || '').toLowerCase();
      const term = searchTerm.toLowerCase().trim();

      const matchesSearch = !term || name.includes(term) || email.includes(term) || code.includes(term);

      const role = String(account.role_name || account.role || account.role_key || '');
      const matchesRole = roleFilter === 'all' || role === roleFilter;

      const status = String(account.status || 'Unavailable');
      const matchesStatus = statusFilter === 'all' || status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [accounts, searchTerm, roleFilter, statusFilter]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-700" />
            <span>Accounts Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse, inspect, and manage user accounts and associated business records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {filteredAccounts.length} of {accounts.length} accounts
          </span>
        </div>
      </div>
      {onPageChange && <div className="flex items-center justify-between text-xs text-slate-500"><span>Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} accounts</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Previous</button><button type="button" disabled={page * pageSize >= totalCount} onClick={() => onPageChange(page + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Next</button></div></div>}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); onPageChange?.(1); }}
            placeholder="Search accounts by name, email, or profile code…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Roles</option>
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Accounts Data Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 space-y-3 text-center">
            <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Loading accounts directory…</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <EmptyState
            title="No accounts found"
            description="No user accounts matched your search and filter criteria."
            action={
              searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                ? {
                    label: 'Clear Filters',
                    onClick: () => {
                      setSearchTerm('');
                      setRoleFilter('all');
                      setStatusFilter('all');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {onSelectForCleanup && (
                    <th className="py-3.5 px-4 w-10 text-center">
                      <span className="sr-only">Select</span>
                    </th>
                  )}
                  <th className="py-3.5 px-4 font-bold">User</th>
                  <th className="py-3.5 px-4 font-bold">Email</th>
                  <th className="py-3.5 px-4 font-bold">Role</th>
                  <th className="py-3.5 px-4 font-bold">Department</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((account) => {
                  const id = String(account.id || '');
                  const name = account.full_name || account.name || 'Unknown user';
                  const email = account.email || '—';
                  const role = account.role_name || account.role || account.role_key || 'Unavailable';
                  const department = account.department || 'Unavailable';
                  const status = account.status || 'Unavailable';
                  const initials = name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  const isChecked = selectedForCleanup.includes(id);

                  return (
                    <tr
                      key={id}
                      onClick={() => onSelectAccount(account)}
                      className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                    >
                      {onSelectForCleanup && (
                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onSelectForCleanup(id)}
                            className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                            aria-label={`Select ${name}`}
                          />
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials || 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors block">
                              {name}
                            </span>
                            {account.profile_code && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {account.profile_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{email}</td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={role} type="role" size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{department}</td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900">
                          <span>View Profile</span>
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
