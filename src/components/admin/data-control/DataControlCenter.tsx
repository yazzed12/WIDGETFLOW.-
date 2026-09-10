import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DataControlNavigation,
  type DataControlDomainKey,
} from './navigation/DataControlNavigation';
import { DataControlHeader, type BreadcrumbItem } from './common/DataControlHeader';
import { DataControlOverview } from './overview/DataControlOverview';
import { AccountExplorer, type AccountRecord } from './accounts/AccountExplorer';
import { AccountDetailPage } from './accounts/AccountDetailPage';
import { TemplateExplorer } from './templates/TemplateExplorer';
import { TemplateDetailPage } from './templates/TemplateDetailPage';
import { ReportExplorer } from './reports/ReportExplorer';
import { ReportDetailPage } from './reports/ReportDetailPage';
import { CategoryExplorer } from './content/CategoryExplorer';
import { ContentLibraryExplorer } from './content/ContentLibraryExplorer';
import { StandardPackExplorer } from './content/StandardPackExplorer';
import { RoleExplorer } from './governance/RoleExplorer';
import { PermissionExplorer } from './governance/PermissionExplorer';
import { NotificationExplorer } from './communication/NotificationExplorer';
import { AssetExplorer, type AssetRecord } from './files/AssetExplorer';
import { AuditExplorer } from './history/AuditExplorer';
import { SystemResetExplorer } from './system/SystemResetExplorer';
import { WorkflowOperationsExplorer } from './history/WorkflowOperationsExplorer';
import {
  adminDataControlService,
  type DataControlDomain,
} from '../../../features/admin/services/adminDataControlService';
import { useApp } from '../../../context/AppContext';
import type { WidgetTemplate, ReportInstance } from '../../../types';
import type { Notification } from '../../../types';
import { mapReportRow } from '../../../features/reports/reportService';

const UnavailableDomain: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="p-6 md:p-8 max-w-3xl mx-auto">
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
      <h1 className="text-lg font-black text-slate-900">{title}</h1>
      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{detail}</p>
    </div>
  </div>
);

export const DataControlCenter: React.FC = () => {
  const {
    users = [],
    templates = [],
    reports = [],
    categories = [],
    notifications = [],
  } = useApp();

  // Navigation State
  const [activeDomain, setActiveDomain] = useState<DataControlDomainKey>('overview');

  // Active records for full-page inspection
  const [activeAccount, setActiveAccount] = useState<AccountRecord | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<WidgetTemplate | null>(null);
  const [activeReport, setActiveReport] = useState<ReportInstance | null>(null);

  // Backend metadata & counts
  const [summaryData, setSummaryData] = useState<DataControlDomain[]>([]);
  const [browseAccounts, setBrowseAccounts] = useState<AccountRecord[]>([]);
  const [browseAssets, setBrowseAssets] = useState<AssetRecord[]>([]);
  const [browseReports, setBrowseReports] = useState<ReportInstance[]>([]);
  const [browseNotifications, setBrowseNotifications] = useState<Notification[]>([]);
  const [browsePage, setBrowsePage] = useState(1);
  const [browseTotals, setBrowseTotals] = useState<Record<string, number>>({});
  const pageSize = 25;
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected for cleanup in Accounts
  const [selectedAccountsForCleanup, setSelectedAccountsForCleanup] = useState<string[]>([]);

  // Map of summary counts
  const summaryCounts = useMemo(() => {
    const map: Record<string, number> = {
      accounts: users.length,
      templates: templates.length,
      reports: reports.length,
      categories: categories.length,
      notifications: notifications.length,
    };
    summaryData.forEach((s) => {
      if (s.domain_key && s.count !== undefined) {
        map[s.domain_key] = s.count;
      }
    });
    if (browseTotals.accounts !== undefined) map.accounts = browseTotals.accounts;
    return map;
  }, [summaryData, users, templates, reports, categories, notifications, browseTotals.accounts]);

  // Load backend summary and initial accounts
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryRows, accountsResult, assetsResult, reportsResult, notificationsResult] = await Promise.all([
        adminDataControlService.getSummary().catch(() => []),
        adminDataControlService.browseDomain('accounts', 1, pageSize).catch(() => null),
        adminDataControlService.browseDomain('assets', 1, pageSize).catch(() => null),
        adminDataControlService.browseDomain('reports', 1, pageSize).catch(() => null),
        adminDataControlService.browseDomain('notifications', 1, pageSize).catch(() => null),
      ]);
      setSummaryData(summaryRows);
      if (accountsResult?.rows) {
        setBrowseAccounts(accountsResult.rows as unknown as AccountRecord[]);
        setBrowseTotals((prev) => ({ ...prev, accounts: accountsResult.total_count }));
      }
      if (assetsResult?.rows) {
        setBrowseAssets(assetsResult.rows as unknown as AssetRecord[]);
        setBrowseTotals((prev) => ({ ...prev, assets: assetsResult.total_count }));
      }
      if (reportsResult?.rows) {
        setBrowseReports(reportsResult.rows.map((row) => mapReportRow(row)));
        setBrowseTotals((prev) => ({ ...prev, reports: reportsResult.total_count }));
      }
      if (notificationsResult?.rows) {
        setBrowseTotals((prev) => ({ ...prev, notifications: notificationsResult.total_count }));
        setBrowseNotifications(notificationsResult.rows.map((row) => ({
          id: String(row.id), userId: String(row.recipient_user_id ?? row.user_id ?? ''),
          title: String(row.title ?? ''), message: String(row.message ?? ''),
          type: row.notification_type ?? row.type, read: Boolean(row.is_read ?? row.read),
          timestamp: String(row.created_at ?? row.timestamp ?? ''), readAt: row.read_at ?? row.readAt,
          relatedTemplateId: row.related_template_id, relatedReportId: row.related_report_id,
          sendCycleId: row.send_cycle_id, reportAssignmentId: row.report_assignment_id,
        } as Notification)));
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Merged accounts: prioritize browseAccounts with fallback to users
  const mergedAccounts: AccountRecord[] = useMemo(() => {
    if (browseAccounts.length > 0) {
      return browseAccounts;
    }
    return users.filter((u) => (u as any).status === undefined || (u as any).status === 'Active').filter((u) => (u as any).authUserId === undefined || Boolean((u as any).authUserId)).map((u) => ({
      id: u.id,
      full_name: u.name,
      email: u.email,
      role: u.role,
      role_name: u.role,
      department: (u as any).department,
      status: (u as any).status,
      profile_code: (u as any).profileCode,
    }));
  }, [browseAccounts, users]);

  const visibleReports = browseReports.length > 0 ? browseReports : reports;
  const visibleNotifications = browseNotifications.length > 0 ? browseNotifications : notifications;

  // Navigation handlers
  const handleSelectDomain = (domain: DataControlDomainKey) => {
    setBrowsePage(1);
    setActiveDomain(domain);
    setActiveAccount(null);
    setActiveTemplate(null);
    setActiveReport(null);
    setSearchTerm('');
  };

  const changeBrowsePage = async (domain: 'accounts' | 'assets' | 'reports' | 'notifications', page: number) => {
    if (page < 1) return;
    const result = await adminDataControlService.browseDomain(domain, page, pageSize).catch(() => null);
    if (!result) return;
    setBrowsePage(page);
    setBrowseTotals((prev) => ({ ...prev, [domain]: result.total_count }));
    if (domain === 'accounts') setBrowseAccounts(result.rows as unknown as AccountRecord[]);
    if (domain === 'assets') setBrowseAssets(result.rows as unknown as AssetRecord[]);
    if (domain === 'reports') setBrowseReports(result.rows.map((row) => mapReportRow(row)));
    if (domain === 'notifications') setBrowseNotifications(result.rows.map((row) => ({ id: String(row.id), userId: String(row.recipient_user_id ?? row.user_id ?? ''), title: String(row.title ?? ''), message: String(row.message ?? ''), type: row.notification_type ?? row.type, read: Boolean(row.is_read ?? row.read), timestamp: String(row.created_at ?? row.timestamp ?? ''), readAt: row.read_at ?? row.readAt, relatedTemplateId: row.related_template_id, relatedReportId: row.related_report_id, sendCycleId: row.send_cycle_id, reportAssignmentId: row.report_assignment_id } as Notification)));
  };

  const handleOpenAccount = (account: AccountRecord) => {
    setActiveAccount(account);
    setActiveTemplate(null);
    setActiveReport(null);
  };

  const handleOpenTemplate = (templateIdOrObj: string | WidgetTemplate) => {
    const t = typeof templateIdOrObj === 'string' ? templates.find((item) => item.id === templateIdOrObj) : templateIdOrObj;
    if (!t) return;

    setActiveTemplate(t);
  };

  const handleOpenReport = (reportIdOrObj: string | ReportInstance) => {
    const r = typeof reportIdOrObj === 'string' ? reports.find((item) => item.id === reportIdOrObj) : reportIdOrObj;
    if (!r) return;

    setActiveReport(r);
  };

  const handleBackToAccounts = () => {
    setActiveAccount(null);
  };

  const handleBackToTemplates = () => {
    setActiveTemplate(null);
  };

  const handleBackToReports = () => {
    setActiveReport(null);
  };

  // Construct Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const items: BreadcrumbItem[] = [
      {
        label: 'Data Control Center',
        onClick: () => handleSelectDomain('overview'),
      },
    ];

    if (activeDomain !== 'overview') {
      const domainLabel =
        activeDomain.charAt(0).toUpperCase() + activeDomain.slice(1).replace(/_/g, ' ');
      items.push({
        label: domainLabel,
        onClick:
          activeAccount || activeTemplate || activeReport
            ? () => {
                setActiveAccount(null);
                setActiveTemplate(null);
                setActiveReport(null);
              }
            : undefined,
      });
    }

    if (activeAccount) {
      items.push({
        label: activeAccount.full_name || activeAccount.name || 'Account Profile',
        onClick:
          activeReport || activeTemplate
            ? () => {
                setActiveTemplate(null);
                setActiveReport(null);
              }
            : undefined,
      });
    }

    if (activeReport) {
      items.push({
        label: activeReport.title || 'Report',
        onClick: activeTemplate ? () => setActiveTemplate(null) : undefined,
      });
    }

    if (activeTemplate) {
      items.push({
        label: activeTemplate.name || 'Template',
      });
    }

    return items;
  }, [activeDomain, activeAccount, activeReport, activeTemplate]);

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden select-none">
      {/* Grouped Sidebar Navigation */}
      <DataControlNavigation
        activeKey={activeDomain}
        onSelect={handleSelectDomain}
        summaryCounts={summaryCounts}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Sticky Header with Breadcrumbs and Search */}
        <DataControlHeader
          breadcrumbs={breadcrumbs}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onClearSearch={() => setSearchTerm('')}
          searchPlaceholder={`Search in ${activeDomain}…`}
          supportsSearch={false}
        />

        {/* Scrollable Content View */}
        <main className="flex-1 overflow-y-auto">
          {/* FULL-PAGE RECORD DETAIL DRILL-DOWNS */}
          {activeTemplate ? (
            <TemplateDetailPage
              template={activeTemplate}
              categories={categories}
              onBack={handleBackToTemplates}
              onNavigateToReport={handleOpenReport}
              onNavigateToUser={(uId) => {
                const acct = mergedAccounts.find((a) => a.id === uId);
                if (acct) handleOpenAccount(acct);
              }}
            />
          ) : activeReport ? (
            <ReportDetailPage
              report={activeReport}
              templates={templates}
              onBack={handleBackToReports}
              onNavigateToTemplate={handleOpenTemplate}
              onNavigateToUser={(uId) => {
                const acct = mergedAccounts.find((a) => a.id === uId);
                if (acct) handleOpenAccount(acct);
              }}
            />
          ) : activeAccount ? (
            <AccountDetailPage
              account={activeAccount}
              onBack={handleBackToAccounts}
              onNavigateToReport={handleOpenReport}
              onNavigateToTemplate={handleOpenTemplate}
            />
          ) : (
            /* DOMAIN EXPLORERS */
            <>
              {activeDomain === 'overview' && (
                <DataControlOverview
                  summaryCounts={summaryCounts}
                  onNavigate={handleSelectDomain}
                />
              )}

              {activeDomain === 'accounts' && (
                <AccountExplorer
                  accounts={mergedAccounts}
                  isLoading={isLoading}
                  onSelectAccount={handleOpenAccount}
                  page={browsePage} totalCount={browseTotals.accounts ?? mergedAccounts.length} pageSize={pageSize}
                  onPageChange={(page) => void changeBrowsePage('accounts', page)}
                  onSelectForCleanup={(id) =>
                    setSelectedAccountsForCleanup((prev) =>
                      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                    )
                  }
                  selectedForCleanup={selectedAccountsForCleanup}
                />
              )}

              {activeDomain === 'templates' && (
                <TemplateExplorer
                  templates={templates}
                  categories={categories}
                  users={mergedAccounts}
                  isLoading={isLoading}
                  onSelectTemplate={handleOpenTemplate}
                  onNavigateToUser={(uId) => {
                    const acct = mergedAccounts.find((a) => a.id === uId);
                    if (acct) handleOpenAccount(acct);
                  }}
                />
              )}

              {activeDomain === 'reports' && (
                <ReportExplorer
                  reports={visibleReports}
                  templates={templates}
                  users={mergedAccounts}
                  isLoading={isLoading}
                  onSelectReport={handleOpenReport}
                  page={browsePage} totalCount={browseTotals.reports ?? visibleReports.length} pageSize={pageSize}
                  onPageChange={(page) => void changeBrowsePage('reports', page)}
                  onNavigateToTemplate={handleOpenTemplate}
                  onNavigateToUser={(uId) => {
                    const acct = mergedAccounts.find((a) => a.id === uId);
                    if (acct) handleOpenAccount(acct);
                  }}
                />
              )}

              {activeDomain === 'distribution' && (
                <UnavailableDomain title="Distribution" detail="A dedicated report assignment/send-cycle read contract is not exposed by the current backend. No inferred distribution rows are shown." />
              )}

              {activeDomain === 'signatures' && (
                <UnavailableDomain title="Signatures" detail="A dedicated historical signature read contract is not exposed by the current backend. Signature payloads are not inferred from report summaries." />
              )}

              {activeDomain === 'categories' && (
                <CategoryExplorer
                  categories={categories}
                  templates={templates}
                  onNavigateToTemplate={handleOpenTemplate}
                />
              )}

              {activeDomain === 'content_library' && <ContentLibraryExplorer />}

              {activeDomain === 'standard_packs' && <StandardPackExplorer />}

              {activeDomain === 'roles' && (
                <RoleExplorer
                  users={mergedAccounts}
                  onNavigateToUser={(uId) => {
                    const acct = mergedAccounts.find((a) => a.id === uId);
                    if (acct) handleOpenAccount(acct);
                  }}
                />
              )}

              {activeDomain === 'permissions' && <PermissionExplorer />}

              {activeDomain === 'notifications' && (
                <NotificationExplorer
                  notifications={visibleNotifications}
                  page={browsePage} totalCount={browseTotals.notifications ?? visibleNotifications.length} pageSize={pageSize}
                  onPageChange={(page) => void changeBrowsePage('notifications', page)}
                  onRefresh={loadInitialData}
                  onNavigateToReport={handleOpenReport}
                  onNavigateToTemplate={handleOpenTemplate}
                />
              )}

              {activeDomain === 'assets' && (
                <AssetExplorer
                  assets={browseAssets}
                  page={browsePage} totalCount={browseTotals.assets ?? browseAssets.length} pageSize={pageSize}
                  onPageChange={(page) => void changeBrowsePage('assets', page)}
                  isLoading={isLoading}
                  onRefresh={loadInitialData}
                />
              )}

              {activeDomain === 'audit' && <AuditExplorer />}

              {activeDomain === 'system_reset' && <SystemResetExplorer onRefresh={loadInitialData} />}
              {activeDomain === 'workflow_operations' && <WorkflowOperationsExplorer />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
