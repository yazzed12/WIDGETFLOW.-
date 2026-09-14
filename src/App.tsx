import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Toast } from './components/common/Toast';

import { TemplateDetailModal } from './components/templates/TemplateDetailModal';

const TemplateBuilder = React.lazy(() =>
  import('./components/template-builder/TemplateBuilder').then((m) => ({ default: m.TemplateBuilder }))
);
import { RequestDetailDrawer } from './components/requests/RequestDetailDrawer';
import { ApprovalDetailDrawer } from './components/approvals/ApprovalDetailDrawer';
import { RequestChatDrawer } from './components/chat/RequestChatDrawer';
import { FillReportModal } from './components/reports/FillReportModal';
import { ReportViewModal } from './components/reports/ReportViewModal';
import { SendReportModal } from './components/reports/SendReportModal';
import { ReturnReportModal } from './components/reports/ReturnReportModal';
import { RejectReportModal } from './components/reports/RejectReportModal';
import { SignReportModal } from './components/reports/SignReportModal';
import { ProfileModal } from './components/profile/ProfileModal';

import { DashboardPage } from './pages/DashboardPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { EngineProofPage } from './pages/EngineProofPage';
import { OrganizationActivityPage } from './pages/OrganizationActivityPage';
import { StickyNotesPage } from './pages/StickyNotesPage';

import { SystemConfigProvider } from './context/SystemConfigContext';
import { AdminLayout } from './components/admin/AdminLayout';
import { AuthProvider } from './features/auth/AuthContext';
import { useAuth } from './features/auth/useAuth';
import { AuthLoadingScreen } from './features/auth/components/AuthLoadingScreen';
import { LoginPage } from './features/auth/LoginPage';
import { LOGIN_PATH, navigateTo, usePathname } from './features/auth/authRouting';
import { resolveAuthView } from './features/auth/authGate';
import { principalToAppUser } from './features/auth/authTypes';

const MainContent: React.FC = () => {
  const { activeView, hasPermission } = useApp();

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardPage />;
      case 'templates':
        return hasPermission('templates.view_approved') ? <TemplatesPage /> : <DashboardPage />;
      case 'my-requests':
        return hasPermission('templates.create') || hasPermission('templates.edit_own_draft') ? <MyRequestsPage /> : <DashboardPage />;
      case 'approvals':
        return hasPermission('template_approvals.view') ? <ApprovalsPage /> : <DashboardPage />;
      case 'reports':
        return hasPermission('reports.view_own') || hasPermission('reports.view_received') || hasPermission('reports.view_organization') ? <ReportsPage /> : <DashboardPage />;
      case 'notifications':
        return hasPermission('notifications.view') ? <NotificationsPage /> : <DashboardPage />;
      case 'organization-activity':
        return hasPermission('audit_history.view') ? <OrganizationActivityPage /> : <DashboardPage />;
      case 'sticky-notes':
        return <StickyNotesPage />;
      case 'engine-proof':
        return <EngineProofPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
      {renderView()}
    </main>
  );
};

const GlobalModals: React.FC = () => {
  const {
    isAddModalOpen,
    draftToEdit,
    closeAddTemplateModal,
    isChatDrawerOpen,
    isProfileModalOpen,
    toggleChatDrawer,
    selectedTemplateForDetail,
    closeTemplateDetail,
    selectedRequestForDrawer,
    closeRequestDetail,
    selectedApprovalForDrawer,
    closeApprovalDetail,
    selectedTemplateForFill,
    closeFillReportModal,
    selectedReportForView,
    closeReportViewModal,
    selectedReportForSend,
    closeSendReportModal,
    selectedReportForReturn,
    closeReturnReportModal,
    selectedReportForReject,
    closeRejectReportModal,
    selectedReportForSign,
    closeSignReportModal,
    closeProfileModal,
    hasPermission,
  } = useApp();

  return (
    <>
      {isAddModalOpen && hasPermission('templates.create') && hasPermission('studio.access') && (
        <React.Suspense fallback={<div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center text-white font-bold text-sm">Loading Studio...</div>}>
          <TemplateBuilder
            initialTemplate={draftToEdit}
            onClose={closeAddTemplateModal}
          />
        </React.Suspense>
      )}

      {selectedTemplateForDetail && (
        <TemplateDetailModal
          template={selectedTemplateForDetail}
          onClose={closeTemplateDetail}
        />
      )}

      {selectedRequestForDrawer && (
        <RequestDetailDrawer
          template={selectedRequestForDrawer}
          onClose={closeRequestDetail}
        />
      )}

      {selectedApprovalForDrawer && (
        <ApprovalDetailDrawer
          template={selectedApprovalForDrawer}
          onClose={closeApprovalDetail}
        />
      )}

      {selectedTemplateForFill && hasPermission('templates.use') && hasPermission('reports.create') && (
        <FillReportModal
          template={selectedTemplateForFill}
          onClose={closeFillReportModal}
        />
      )}

      {selectedReportForView && (
        <ReportViewModal
          report={selectedReportForView}
          onClose={closeReportViewModal}
        />
      )}

      {selectedReportForSend && hasPermission('reports.send') && (
        <SendReportModal
          report={selectedReportForSend}
          onClose={closeSendReportModal}
        />
      )}

      {selectedReportForReturn && hasPermission('reports.return') && (
        <ReturnReportModal
          report={selectedReportForReturn}
          onClose={closeReturnReportModal}
        />
      )}

      {selectedReportForReject && hasPermission('reports.reject') && (
        <RejectReportModal
          report={selectedReportForReject}
          onClose={closeRejectReportModal}
        />
      )}

      {selectedReportForSign && hasPermission('reports.sign') && (
        <SignReportModal
          report={selectedReportForSign}
          onClose={closeSignReportModal}
        />
      )}

      {isProfileModalOpen && (
        <ProfileModal onClose={closeProfileModal} />
      )}

      {isChatDrawerOpen && (
        <RequestChatDrawer onClose={() => toggleChatDrawer(false)} />
      )}
    </>
  );
};

const AppShell: React.FC = () => {
  const { isProtectedAdmin } = useAuth();

  if (isProtectedAdmin) {
    return <AdminLayout />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
      {/* Main Application Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Navbar */}
          <Navbar />

          {/* Page View */}
          <MainContent />
        </div>
      </div>

      {/* Global Modals & Drawers */}
      <GlobalModals />

      {/* Global Toast */}
      <Toast />
    </div>
  );
};

const WidgetFlowApplication: React.FC = () => {
  const { principal } = useAuth();
  const appUser = React.useMemo(
    () => principal ? principalToAppUser(principal) : null,
    [principal],
  );
  if (!appUser) return <AuthLoadingScreen />;

  return (
    <SystemConfigProvider>
      <AppProvider key={appUser.id} authenticatedPrincipal={appUser}>
        <AppShell />
      </AppProvider>
    </SystemConfigProvider>
  );
};

const AuthenticatedEntry: React.FC = () => {
  const { status } = useAuth();
  const pathname = usePathname();
  const view = resolveAuthView(status);

  React.useEffect(() => {
    if (status === 'authenticated' && pathname === LOGIN_PATH) {
      navigateTo('/', true);
    } else if ((status === 'unauthenticated' || status === 'blocked') && pathname !== LOGIN_PATH) {
      navigateTo(LOGIN_PATH, true);
    }
  }, [pathname, status]);

  if (view === 'application') return <WidgetFlowApplication />;
  if (view === 'login') return <LoginPage />;
  return <AuthLoadingScreen />;
};

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedEntry />
    </AuthProvider>
  );
}
