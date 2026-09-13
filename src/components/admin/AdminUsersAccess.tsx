import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Edit3, KeyRound, ShieldPlus, UserPlus, Users, X, XCircle } from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService';
import type { EmploymentStatus, OrganizationalRole, User } from '../../types';
import { AdminInfoTooltip } from './AdminInfoTooltip';
import { normalizeError } from '../../lib/errors/errorHandling';

type UserEditor = { name: string; email: string; department: string; roleId: string; status: EmploymentStatus };

const STATUSES: EmploymentStatus[] = ['Active', 'Inactive', 'Resigned', 'Terminated'];

export const AdminUsersAccess: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<OrganizationalRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editor, setEditor] = useState<UserEditor | null>(null);
  const [confirmHighImpact, setConfirmHighImpact] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('role-employee');
  const [newUserDept, setNewUserDept] = useState('Operations');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserManagerId, setNewUserManagerId] = useState('');
  const [createAdminMode, setCreateAdminMode] = useState(false);
  const [confirmAdminCreation, setConfirmAdminCreation] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setPageError(null);
      const [data, catalog] = await Promise.all([adminService.users(), adminService.roleCatalog()]);
      const assignableRoles = catalog.roles.filter((role) => role.isActive && !role.isProtected && role.key !== 'admin');
      setUsers(Array.isArray(data) ? data : []);
      setRoles(Array.isArray(assignableRoles) ? assignableRoles : []);
      setNewUserRoleId((current) => assignableRoles.some((role) => role.id === current) ? current : (assignableRoles[0]?.id ?? ''));
    } catch (err: any) {
      console.error('Failed to fetch admin users:', err);
      setPageError(err.message || 'Unable to load company user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const openEditor = (user: User) => {
    if (user.roleKey === 'admin' && user.roleType === 'System' && user.roleProtected) return;
    setEditingUser(user);
    setEditor({
      name: user.name,
      email: user.email,
      department: user.department,
      roleId: user.roleId || '',
      status: user.status || 'Active',
    });
    setModalError(null);
    setConfirmHighImpact(false);
  };

  const persistEditor = async () => {
    if (!editingUser || !editor) return;
    try {
      setIsSubmitting(true);
      setModalError(null);
      if (editor.roleId !== editingUser.roleId && editor.status !== (editingUser.status || 'Active')) {
        throw new Error('Change role and employment status in separate saves so each governance check is independently confirmed.');
      }
      if (editor.roleId !== editingUser.roleId) {
        await adminService.changeUserRole(editingUser.id, editor.roleId, 'Admin Users & Access update');
      }
      if (editor.status !== (editingUser.status || 'Active')) {
        await adminService.setUserStatus(editingUser.id, editor.status);
      }
      await fetchUsers();
      setEditingUser(null);
      setEditor(null);
      setConfirmHighImpact(false);
    } catch (err: any) {
      setModalError(err.message || 'Unable to save user changes.');
      setConfirmHighImpact(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestSave = () => {
    if (!editingUser || !editor) return;
    const isEnteringHighImpact = editor.status !== editingUser.status && (editor.status === 'Resigned' || editor.status === 'Terminated');
    if (isEnteringHighImpact) {
      setConfirmHighImpact(true);
      return;
    }
    void persistEditor();
  };

  const handleCreateUserSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail.trim())) { setEmailError('Please enter a valid email address.'); setModalError(null); return; }
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserDept.trim() || !newUserPassword) {
      setModalError('Name, email, initial password, and department are required.');
      return;
    }
    if (newUserPassword.length < 12 || newUserPassword.length > 128 || newUserPassword.trim().length === 0) { setPasswordError('Password must be between 12 and 128 characters.'); setModalError(null); return; }
    if (createAdminMode && !confirmAdminCreation) {
      setModalError('Confirm that this account will receive protected Admin access.');
      return;
    }
    try {
      setIsSubmitting(true);
      setModalError(null);
      if (createAdminMode) {
        await adminService.createAdmin({ fullName: newUserName.trim(), email: newUserEmail.trim(),
          initialPassword: newUserPassword, department: newUserDept.trim() });
      } else {
        await adminService.createUser({ fullName: newUserName.trim(), email: newUserEmail.trim(),
          initialPassword: newUserPassword, roleId: newUserRoleId, department: newUserDept.trim(),
          managerUserId: newUserManagerId || null });
      }
      await fetchUsers();
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setConfirmAdminCreation(false);
    } catch (err: any) {
      const safe = normalizeError(err); if (safe.field === 'email') setEmailError(safe.message); else if (safe.field === 'password') setPasswordError(safe.message); else setModalError(safe.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusClass = (status: EmploymentStatus) => status === 'Active'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : status === 'Inactive'
    ? 'text-slate-700 bg-slate-100 border-slate-200'
    : status === 'Resigned'
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-rose-700 bg-rose-50 border-rose-200';

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2"><Users className="w-5 h-5 text-purple-600" /><h2 className="text-xl font-black tracking-tight text-slate-900">Users & Access Management</h2></div>
          <p className="text-xs text-slate-500 font-medium pt-1">Manage company identities, operational roles, departments, and employment status.</p>
        </div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => { setModalError(null); setCreateAdminMode(false); setShowAddUserModal(true); }} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"><UserPlus className="w-4 h-4" /><span>Add User</span></button><button type="button" onClick={() => { setModalError(null); setCreateAdminMode(true); setConfirmAdminCreation(false); setShowAddUserModal(true); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"><ShieldPlus className="w-4 h-4" /><span>Add Admin</span></button></div>
      </div>

      {pageError ? (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl space-y-3"><p className="text-sm font-bold text-rose-900">{pageError}</p><button onClick={() => void fetchUsers()} className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl cursor-pointer">Retry Loading Users</button></div>
      ) : loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading user directory...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">User Name</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <AdminInfoTooltip
                        title="Employment Status"
                        description="Controls user operational availability for new workflow assignments. Inactive, Resigned, or Terminated users cannot log in or be assigned new reviews, but all historical records remain preserved."
                        whoItAffects="The selected user account."
                      />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const status = user.status || 'Active';
                  const isAdmin = user.roleKey === 'admin' && user.roleType === 'System' && user.roleProtected;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg ${user.avatarBg || 'bg-indigo-600'} text-white font-bold flex items-center justify-center text-xs`}>{user.avatarInitials || user.name.substring(0, 2).toUpperCase()}</div><div><div className="font-extrabold text-slate-900">{user.name}</div><div className="text-[10px] font-mono text-slate-400">{user.profileCode || 'Business ID pending'}</div></div></div></td>
                      <td className="py-3.5 px-4"><span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200">{user.role}</span></td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700"><div>{user.department}</div>{user.managerName && <div className="text-[10px] font-normal text-slate-400">Manager: {user.managerName}</div>}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{user.email}</td>
                      <td className="py-3.5 px-4"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold ${statusClass(status)}`}>{status === 'Active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}{status}</span></td>
                      <td className="py-3.5 px-4 text-right">{isAdmin ? <span className="text-[10px] text-slate-400 font-semibold italic">System Protected</span> : <button type="button" onClick={() => openEditor(user)} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-lg font-bold text-xs cursor-pointer"><Edit3 className="w-3.5 h-3.5" />Edit User</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingUser && editor && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3"><div><h3 className="text-sm font-extrabold text-slate-900">Edit User</h3><p className="text-xs text-slate-500">Role controls responsibility. Status controls future availability.</p></div><button type="button" onClick={() => { setEditingUser(null); setEditor(null); }} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button></div>
            {modalError && <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold">{modalError}</div>}
            <div className="space-y-4 text-xs">
              <label className="block space-y-1"><span className="font-bold text-slate-700">Name</span><input disabled value={editor.name} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100" /></label>
              <label className="block space-y-1"><span className="font-bold text-slate-700">Email</span><input disabled type="email" value={editor.email} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100" /></label>
              <label className="block space-y-1"><span className="font-bold text-slate-700">Department</span><input disabled value={editor.department} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100" /></label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1"><span className="font-bold text-slate-700">Role</span><select value={editor.roleId} onChange={(event) => setEditor({ ...editor, roleId: event.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
                <label className="block space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700">Status</span>
                    <AdminInfoTooltip
                      title="Employment Status"
                      description="Active: Available for assignments. Inactive/Resigned/Terminated: Removes user from new assignments while preserving historical activity."
                    />
                  </div>
                  <select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value as EmploymentStatus })} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white">{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                </label>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"><div className="font-bold text-slate-700 flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" />Reset Password</div><div className="flex gap-2"><input type="password" autoComplete="new-password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="New password" className="flex-1 px-3 py-2 rounded-xl border border-slate-300" /><button type="button" disabled={isSubmitting || !resetPassword} onClick={async () => { try { setIsSubmitting(true); setModalError(null); await adminService.resetPassword(editingUser.id, resetPassword); setResetPassword(''); } catch (err: any) { setModalError(err.message || 'Unable to reset password.'); } finally { setIsSubmitting(false); } }} className="px-3 py-2 bg-slate-800 text-white rounded-xl font-bold disabled:opacity-50">Reset</button></div><p className="text-[10px] text-slate-500">Password values are sent directly to the secured operation and are never persisted or displayed.</p></div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100"><button type="button" onClick={() => { setEditingUser(null); setEditor(null); }} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">Cancel</button><button type="button" onClick={requestSave} disabled={isSubmitting} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save Changes'}</button></div>
          </div>
        </div>
      )}

      {confirmHighImpact && editingUser && editor && (
        <div className="fixed inset-0 z-[60] bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"><div className="flex items-center gap-3"><div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl"><AlertTriangle className="w-6 h-6" /></div><div><h3 className="text-base font-extrabold text-slate-900">Mark {editingUser.name} as {editor.status}?</h3><p className="text-xs text-slate-500">Confirm employment-status change</p></div></div><p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">This user will no longer be available for new workflow assignments. Historical reports, approvals, signatures, and audit records will be preserved.</p><div className="flex justify-end gap-3"><button type="button" onClick={() => setConfirmHighImpact(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">Cancel</button><button type="button" onClick={() => void persistEditor()} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl cursor-pointer">Confirm {editor.status}</button></div></div>
        </div>
      )}

      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3"><div className="flex items-center gap-2">{createAdminMode ? <ShieldPlus className="w-5 h-5 text-slate-800" /> : <UserPlus className="w-5 h-5 text-purple-600" />}<h3 className="text-sm font-extrabold text-slate-900">{createAdminMode ? 'Add Protected Admin' : 'Add New User'}</h3></div><button type="button" onClick={() => setShowAddUserModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button></div>
            {modalError && <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold">{modalError}</div>}
            <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
              <label className="block space-y-1"><span className="font-bold text-slate-700">Full Name *</span><input value={newUserName} onChange={(event) => setNewUserName(event.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300" required /></label>
              <label className="block space-y-1"><span className="font-bold text-slate-700">Email Address *</span><input type="email" value={newUserEmail} onChange={(event) => { setNewUserEmail(event.target.value); setEmailError(null); }} className={`w-full px-3 py-2 rounded-xl border ${emailError ? 'border-rose-400' : 'border-slate-300'}`} aria-invalid={Boolean(emailError)} required />{emailError && <span className="text-[11px] text-rose-600">{emailError}</span>}</label>
              <label className="block space-y-1"><span className="font-bold text-slate-700">Initial Password *</span><input type="password" autoComplete="new-password" value={newUserPassword} onChange={(event) => { setNewUserPassword(event.target.value); setPasswordError(null); }} className={`w-full px-3 py-2 rounded-xl border ${passwordError ? 'border-rose-400' : 'border-slate-300'}`} aria-invalid={Boolean(passwordError)} required />{passwordError && <span className="text-[11px] text-rose-600">{passwordError}</span>}</label>
              <div className="grid grid-cols-2 gap-4">{!createAdminMode && <label className="block space-y-1"><span className="font-bold text-slate-700">Role *</span><select value={newUserRoleId} onChange={(event) => setNewUserRoleId(event.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>}<label className="block space-y-1"><span className="font-bold text-slate-700">Department *</span><input value={newUserDept} onChange={(event) => setNewUserDept(event.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300" required /></label></div>
              {!createAdminMode && <label className="block space-y-1"><span className="font-bold text-slate-700">Manager (optional)</span><select value={newUserManagerId} onChange={(event) => setNewUserManagerId(event.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"><option value="">No manager</option>{users.filter((user) => user.status === 'Active').map((user) => <option key={user.id} value={user.id}>{user.name} — {user.role}</option>)}</select></label>}
              {createAdminMode && <label className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900"><input type="checkbox" checked={confirmAdminCreation} onChange={(event) => setConfirmAdminCreation(event.target.checked)} /><span className="font-semibold">I confirm this creates a protected Admin with platform administration authority.</span></label>}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100"><button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer">Cancel</button><button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50">{isSubmitting ? 'Creating...' : createAdminMode ? 'Create Admin' : 'Create User'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
