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
import { InsightsPage } from '../../pages/InsightsPage';
import { InsightsAccessManagement } from './InsightsAccessManagement';
import { canAccessInsights } from '../../features/insights/templateInsightsAccess';
import { AdminDelegations } from './AdminDelegations';
import type { AdminViewType } from '../../types';

export const AdminLayout: React.FC = () => {
  const { currentUser, insightsAccess, refreshInsightsAccess, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<AdminViewType>('overview');

  const selectAdminTab = (tab: AdminViewType) => {
    if (tab !== 'insights') {
      setActiveTab(tab);
      return;
    }
    void refreshInsightsAccess().then((allowed) => {
      if (allowed === true) setActiveTab('insights');
      else if (allowed === false) showToast('Your access to Insights has changed.', 'warning');
      else showToast("We couldn't verify your Insights access.", 'warning');
    });
  };

  React.useEffect(() => {
    if (activeTab !== 'insights') return;
    if (insightsAccess.status === 'ready' && !insightsAccess.insightsAllowed) {
      setActiveTab('overview');
      showToast('Your access to Insights has changed.', 'warning');
    } else if (insightsAccess.status === 'error') {
      setActiveTab('overview');
      showToast("We couldn't verify your Insights access.", 'warning');
    }
  }, [activeTab, insightsAccess.status, insightsAccess.insightsAllowed, showToast]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans">
      {/* Admin Header */}
      <AdminHeader currentUser={currentUser} />

      {/* Main Admin Content Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar Navigation */}
        <AdminSidebar activeTab={activeTab} onSelectTab={selectAdminTab} insightsVisible={canAccessInsights(insightsAccess)} />

        {/* Admin Sub-View Router Container */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {activeTab === 'overview' && <AdminOverview onNavigateTab={setActiveTab} />}
          {activeTab === 'data-control' && <AdminDataControlCenter />}
          {activeTab === 'features' && <AdminFeatureManagement onManageInsightsAccess={() => setActiveTab('insights-access')} />}
          {activeTab === 'insights-access' && <InsightsAccessManagement onBack={() => setActiveTab('features')} />}
          {activeTab === 'insights' && (canAccessInsights(insightsAccess)
            ? <InsightsPage />
            : <output aria-live="polite" className="m-6 block rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Checking Insights access…</output>)}
          {activeTab === 'studio-config' && <AdminStudioConfig />}
          {activeTab === 'packs' && <AdminPackManagement />}
          {activeTab === 'elements' && <AdminElementManagement />}
          {activeTab === 'content-library' && <AdminContentLibraryManagement />}
          {activeTab === 'users' && <AdminUsersAccess />}
          {activeTab === 'delegations' && <AdminDelegations />}
          {activeTab === 'roles' && <AdminRolesPermissions />}
          {activeTab === 'categories' && <AdminCategories />}
          {activeTab === 'settings' && <AdminSystemSettings />}
          {activeTab === 'audit' && <AdminAuditLog />}
        </main>
      </div>
    </div>
  );
};
