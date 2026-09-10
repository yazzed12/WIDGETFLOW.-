import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { AdminOverview } from './AdminOverview';
import { AdminFeatureManagement } from './AdminFeatureManagement';
import { AdminStudioConfig } from './AdminStudioConfig';
import { AdminPackManagement } from './AdminPackManagement';
import { AdminElementManagement } from './AdminElementManagement';
import { AdminContentLibraryManagement } from './AdminContentLibraryManagement';
import { AdminUsersAccess } from './AdminUsersAccess';
import { AdminCategories } from './AdminCategories';
import { AdminSystemSettings } from './AdminSystemSettings';
import { AdminAuditLog } from './AdminAuditLog';
import { AdminRolesPermissions } from './AdminRolesPermissions';
import { AdminDataControlCenter } from './AdminDataControlCenter';
import type { AdminViewType } from '../../types';

export const AdminLayout: React.FC = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<AdminViewType>('overview');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans">
      {/* Admin Header */}
      <AdminHeader currentUser={currentUser} />

      {/* Main Admin Content Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar Navigation */}
        <AdminSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Admin Sub-View Router Container */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {activeTab === 'overview' && <AdminOverview onNavigateTab={setActiveTab} />}
          {activeTab === 'data-control' && <AdminDataControlCenter />}
          {activeTab === 'features' && <AdminFeatureManagement />}
          {activeTab === 'studio-config' && <AdminStudioConfig />}
          {activeTab === 'packs' && <AdminPackManagement />}
          {activeTab === 'elements' && <AdminElementManagement />}
          {activeTab === 'content-library' && <AdminContentLibraryManagement />}
          {activeTab === 'users' && <AdminUsersAccess />}
          {activeTab === 'roles' && <AdminRolesPermissions />}
          {activeTab === 'categories' && <AdminCategories />}
          {activeTab === 'settings' && <AdminSystemSettings />}
          {activeTab === 'audit' && <AdminAuditLog />}
        </main>
      </div>
    </div>
  );
};
