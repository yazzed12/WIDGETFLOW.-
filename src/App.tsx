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
import { InsightsPage } from './pages/InsightsPage';
import { canAccessInsights } from './features/insights/templateInsightsAccess';
import { DelegationsPage } from './pages/DelegationsPage';
import { canAuthorTemplate, canCreateTemplateBackedReport } from './features/delegations/effectiveAuthority';

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
  const { activeView, hasPermission, hasTemplateApprovalPermission, insightsAccess, authorityContextStatus, operationalWorkspaceLoading, operationalWorkspaceError, reportsError, refreshReports, refreshAuthorityContext, canOpenOperationalReadView, isDelegatedMode } = useApp();

  if (operationalWorkspaceLoading || authorityContextStatus === 'loading') {
    return <main className="min-h-0 flex-1 overflow-y-auto p-8"><output aria-live="polite" className="block rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Refreshing your operational workspace…</output></main>;
  }
  if (authorityContextStatus !== 'ready' || operationalWorkspaceError) {
    return <main className="min-h-0 flex-1 overflow-y-auto p-8"><section role="alert" className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-white p-6 text-center shadow-xs"><h1 className="text-sm font-bold text-slate-900">Workspace unavailable</h1><p className="mt-2 text-xs text-slate-600">{operationalWorkspaceError || 'Your authority could not be verified. No workspace data is being shown.'}</p><button type="button" onClick={() => void refreshAuthorityContext()} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Retry</button></section></main>;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardPage />;
      case 'templates':
        return canOpenOperationalReadView('templates') ? <TemplatesPage /> : <DashboardPage />;
      case 'my-requests':
        return canOpenOperationalReadView('my-requests') ? <MyRequestsPage /> : <DashboardPage />;
      case 'approvals':
        return authorityContextStatus === 'ready' && hasTemplateApprovalPermission('template_approvals.view') ? <ApprovalsPage /> : <DashboardPage />;
      case 'delegations':
        return <DelegationsPage />;
      case 'reports':
        return canOpenOperationalReadView('reports') ? <ReportsPage /> : <DashboardPage />;
      case 'insights':
        return !isDelegatedMode && canAccessInsights(insightsAccess)
          ? <InsightsPage />
          : insightsAccess.status === 'loading'
            ? <output aria-live="polite" className="block rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Checking Insights access…</output>
            : <DashboardPage />;
      case 'notifications':
        return hasPermission('notifications.view') ? <NotificationsPage /> : <DashboardPage />;
      case 'organization-activity':
        return !isDelegatedMode && hasPermission('audit_history.view') ? <OrganizationActivityPage /> : <DashboardPage />;
      case 'sticky-notes':
        return isDelegatedMode ? <DashboardPage /> : <StickyNotesPage />;
      case 'engine-proof':
        return isDelegatedMode ? <DashboardPage /> : <EngineProofPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
      {reportsError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><span>{reportsError}</span><button type="button" onClick={() => void refreshReports()} className="font-semibold underline underline-offset-2">Retry</button></div>}
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
    hasOperationalPermission,
    insightsAccess,
    isDelegatedMode,
    operationalWorkspaceLoading,
  } = useApp();
  const canOpenDraftRevision = Boolean(draftToEdit?.id) && canAccessInsights(insightsAccess);
  const canAuthorTemplates = canAuthorTemplate(hasOperationalPermission, draftToEdit?.id);

  if (operationalWorkspaceLoading) return null;

  return (
    <>
      {isAddModalOpen && (canAuthorTemplates || (!isDelegatedMode && canOpenDraftRevision)) && (
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

      {selectedTemplateForFill && canCreateTemplateBackedReport(hasOperationalPermission) && (
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

      {selectedReportForSend && hasOperationalPermission('reports.send') && (!isDelegatedMode || selectedReportForSend.sourceType === 'template') && (
        <SendReportModal
          report={selectedReportForSend}
          onClose={closeSendReportModal}
        />
      )}

      {selectedReportForReturn && hasOperationalPermission('reports.return') && (
        <ReturnReportModal
          report={selectedReportForReturn}
          onClose={closeReturnReportModal}
        />
      )}

      {selectedReportForReject && hasOperationalPermission('reports.reject') && (
        <RejectReportModal
          report={selectedReportForReject}
          onClose={closeRejectReportModal}
        />
      )}

      {selectedReportForSign && hasOperationalPermission('reports.sign') && (
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
    <div className="h-dvh min-h-0 flex flex-col bg-slate-50 font-sans overflow-hidden">
      {/* Main Application Layout */}
      <div className="min-h-0 flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <div className="min-h-0 flex-1 flex flex-col min-w-0 overflow-hidden">
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
  const { principal, status, sessionGeneration } = useAuth();
  const appUser = React.useMemo(
    () => principal ? principalToAppUser(principal) : null,
    [principal],
  );
  if (status !== 'authenticated' || !appUser) return <AuthLoadingScreen />;

  return (
    <SystemConfigProvider>
      <AppProvider key={`${appUser.id}:${sessionGeneration}`} authenticatedPrincipal={appUser}>
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
