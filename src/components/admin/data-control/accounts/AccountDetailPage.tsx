import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Mail,
  Building2,
  Calendar,
  FileSpreadsheet,
  FileCode2,
  HardDrive,
  Shield,
  AlertOctagon,
  ChevronRight,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import type { AccountRecord } from './AccountExplorer';
import { StatusPill } from '../common/StatusPill';
import { formatDate } from '../common/entityResolvers';
import { AdvancedRecordDetails } from '../common/AdvancedRecordDetails';
import { ReviewChangesDialog } from '../common/ReviewChangesDialog';
import { DeleteAccountModal } from '../common/DeleteAccountModal';
import { adminDataControlService } from '../../../../features/admin/services/adminDataControlService';
import { useApp } from '../../../../context/AppContext';

type AccountTab = 'overview' | 'reports' | 'templates' | 'activity' | 'files' | 'management';

interface AccountDetailPageProps {
  account: AccountRecord;
  onBack: () => void;
  onNavigateToReport: (reportId: string) => void;
  onNavigateToTemplate: (templateId: string) => void;
}

export const AccountDetailPage: React.FC<AccountDetailPageProps> = ({
  account,
  onBack,
  onNavigateToReport,
  onNavigateToTemplate,
}) => {
  const { reports: allReports, templates: allTemplates, notifications: allNotifications } = useApp();
  const [activeTab, setActiveTab] = useState<AccountTab>('overview');
  const [accountSummary, setAccountSummary] = useState<Record<string, unknown> | null>(null);

  // Management & Review Dialog states
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['notifications']);
  const [isExecutingCleanup, setIsExecutingCleanup] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  // Sub-tabs for Reports & Templates
  const [reportsSubTab, setReportsSubTab] = useState<'created' | 'received' | 'assigned'>('created');
  const [templatesSubTab, setTemplatesSubTab] = useState<'created' | 'reviewed'>('created');

  const userId = String(account.id || '');
  const userName = account.full_name || account.name || 'User Profile';
  const userEmail = account.email || '—';
  const roleName = account.role_name || account.role || account.role_key || 'Unavailable';
  const department = account.department || 'Unavailable';
  const status = account.status || 'Unavailable';

  // Load account summary from adminDataControlService
  useEffect(() => {
    let cancelled = false;
    if (userId) {
      adminDataControlService
        .getAccountSummary(userId)
        .then((data) => {
          if (!cancelled) setAccountSummary(data);
        })
        .catch(() => {
          if (!cancelled) setAccountSummary(null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Derive reports for this user
  const createdReports = allReports.filter((r) => r.createdById === userId);
  const receivedReports = allReports.filter(
    (r) => r.sentToId === userId || r.assignments?.some((a) => a.recipientUserId === userId)
  );
  const assignedReports = allReports.filter(
    (r) =>
      r.status === 'Sent' &&
      (r.sentToId === userId ||
        r.signatureAssignments?.some((s) => s.recipientUserId === userId))
  );

  // Derive templates for this user
  const createdTemplates = allTemplates.filter((t) => t.createdById === userId);
  const reviewedTemplates = allTemplates.filter(
    (t) => t.requestedApprovalFromUserId === userId || (t as any).reviewerUserId === userId
  );

  // Derive notifications for this user
  const userNotifications = allNotifications.filter(
    (n) => n.userId === userId || (n as any).recipient_user_id === userId
  );

  // Business metrics from RPC or fallback
  const reportsCreatedCount = Number(accountSummary?.reports_created ?? createdReports.length);
  const reportsReceivedCount = Number(accountSummary?.reports_received ?? receivedReports.length);
  const templatesCreatedCount = Number(accountSummary?.templates_created ?? createdTemplates.length);
  const notificationsCount = Number(accountSummary?.notifications ?? userNotifications.length);
  const commentsCount = Number(accountSummary?.comments ?? 0);
  const assetsCount = Number(accountSummary?.assets ?? 0);

  // Cleanup handler
  const handleExecuteCleanup = async () => {
    setIsExecutingCleanup(true);
    setCleanupMessage(null);
    try {
      await adminDataControlService.executeAccountCleanup(
        userId,
        selectedCategories,
        'CLEAN SELECTED ACCOUNT DATA'
      );
      setCleanupMessage('Account data cleaned successfully.');
      setIsReviewOpen(false);
      // Refresh summary
      const refreshed = await adminDataControlService.getAccountSummary(userId);
      setAccountSummary(refreshed);
    } catch (err) {
      setCleanupMessage(err instanceof Error ? err.message : 'Unable to complete data cleanup.');
    } finally {
      setIsExecutingCleanup(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Accounts</span>
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 text-xl font-black flex items-center justify-center shrink-0 shadow-xs">
              {userName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{userName}</h1>
                <StatusPill status={roleName} type="role" />
                <StatusPill status={status} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {userEmail}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {department}
                </span>
                {account.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Joined {formatDate(account.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('management')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-xs cursor-pointer"
            >
              Manage Account Data
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'reports', label: `Reports (${reportsCreatedCount + reportsReceivedCount})` },
            { id: 'templates', label: `Templates (${templatesCreatedCount})` },
            { id: 'activity', label: 'Activity' },
            { id: 'files', label: `Files (${assetsCount})` },
            { id: 'management', label: 'Account Data & Safety' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AccountTab)}
                className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {cleanupMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{cleanupMessage}</span>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Primary Business Data Summary */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Business Data Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Reports Created
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {reportsCreatedCount}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Reports Received
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {reportsReceivedCount}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Templates Created
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {templatesCreatedCount}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Notifications
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {notificationsCount}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Files &amp; Assets
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{assetsCount}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Discussions &amp; Comments
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {commentsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Account Profile Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Account Identity &amp; Placement
              </h3>
              <dl className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Full Name</dt>
                  <dd className="font-bold text-slate-900">{userName}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Email Address</dt>
                  <dd className="font-bold text-slate-900">{userEmail}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Role Assignment</dt>
                  <dd className="font-bold text-slate-900">{roleName}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Department</dt>
                  <dd className="font-bold text-slate-900">{department}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Account Status</dt>
                  <dd className="font-bold text-slate-900">{status}</dd>
                </div>
                {account.profile_code && (
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-slate-500 font-medium">Profile Code</dt>
                    <dd className="font-mono text-slate-700">{account.profile_code}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Safeguards Summary */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Integrity &amp; Preservation Status
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Historical Records Preserved</p>
                    <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                      All reports created or received by {userName} remain permanently intact for audit compliance.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <Lock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Protected Organization Templates</p>
                    <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                      Templates authored by this user remain active in the system catalog to maintain operational workflows.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced details for support/debugging */}
          <AdvancedRecordDetails recordId={userId} data={account} />
        </div>
      )}

      {/* TAB 2: REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setReportsSubTab('created')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                reportsSubTab === 'created'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Created by {userName.split(' ')[0]} ({createdReports.length})
            </button>
            <button
              type="button"
              onClick={() => setReportsSubTab('received')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                reportsSubTab === 'received'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Received by {userName.split(' ')[0]} ({receivedReports.length})
            </button>
            <button
              type="button"
              onClick={() => setReportsSubTab('assigned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                reportsSubTab === 'assigned'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Assigned / Pending ({assignedReports.length})
            </button>
          </div>

          {/* Reports list */}
          {(() => {
            const list =
              reportsSubTab === 'created'
                ? createdReports
                : reportsSubTab === 'received'
                ? receivedReports
                : assignedReports;

            if (list.length === 0) {
              return (
                <div className="p-12 text-center rounded-3xl border border-slate-200/80 bg-white">
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No reports found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No reports match the selected category for this account.
                  </p>
                </div>
              );
            }

            return (
              <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4 font-bold">Report Title</th>
                      <th className="py-3.5 px-4 font-bold">Template</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold">Recipients</th>
                      <th className="py-3.5 px-4 font-bold">Created</th>
                      <th className="py-3.5 px-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((rep) => (
                      <tr
                        key={rep.id}
                        onClick={() => onNavigateToReport(rep.id)}
                        className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-purple-700">
                          {rep.title || 'Untitled Report'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {rep.templateName || 'Template'}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusPill status={rep.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {rep.assignments?.length || (rep.sentToName ? 1 : 0)} recipient(s)
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {formatDate(rep.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900">
                            <span>Open Report</span>
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setTemplatesSubTab('created')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                templatesSubTab === 'created'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Created by {userName.split(' ')[0]} ({createdTemplates.length})
            </button>
            <button
              type="button"
              onClick={() => setTemplatesSubTab('reviewed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                templatesSubTab === 'reviewed'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Reviewed by {userName.split(' ')[0]} ({reviewedTemplates.length})
            </button>
          </div>

          {/* Templates list */}
          {(() => {
            const list = templatesSubTab === 'created' ? createdTemplates : reviewedTemplates;

            if (list.length === 0) {
              return (
                <div className="p-12 text-center rounded-3xl border border-slate-200/80 bg-white">
                  <FileCode2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No templates found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No templates match this category for this account.
                  </p>
                </div>
              );
            }

            return (
              <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4 font-bold">Template Name</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold">Version</th>
                      <th className="py-3.5 px-4 font-bold">Updated</th>
                      <th className="py-3.5 px-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((tpl) => (
                      <tr
                        key={tpl.id}
                        onClick={() => onNavigateToTemplate(tpl.id)}
                        className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-purple-700">
                          {tpl.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusPill status={tpl.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          v{tpl.version ?? '1'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {formatDate(tpl.updatedAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:text-purple-900">
                            <span>Open Template</span>
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 4: ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent Account Timeline
          </h3>
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            <div className="relative">
              <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-purple-600 ring-4 ring-white" />
              <p className="text-xs font-bold text-slate-900">Account Access Verified</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Active session active in system.</p>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">Recent</span>
            </div>
            {account.created_at && (
              <div className="relative">
                <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-slate-400 ring-4 ring-white" />
                <p className="text-xs font-bold text-slate-900">Account Profile Initialized</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assigned role {roleName} in department {department}.
                </p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  {formatDate(account.created_at, true)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: FILES */}
      {activeTab === 'files' && (
        <div className="p-8 text-center rounded-3xl border border-slate-200/80 bg-white space-y-2">
          <HardDrive className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-xs font-bold text-slate-800">Account Media &amp; Files</h3>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            {assetsCount > 0
              ? `${assetsCount} file assets owned by this account are cataloged under Asset Storage.`
              : 'No file attachments directly owned by this account.'}
          </p>
        </div>
      )}

      {/* TAB 6: MANAGEMENT & SAFETY */}
      {activeTab === 'management' && (
        <div className="space-y-6">
          {/* Manage Account Data */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Removable Account Data</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select specific personal data categories eligible for safe removal. Core account access, reports, and templates will remain preserved.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition-colors flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes('notifications')}
                  onChange={(e) =>
                    setSelectedCategories((prev) =>
                      e.target.checked
                        ? [...prev, 'notifications']
                        : prev.filter((k) => k !== 'notifications')
                    )
                  }
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">
                    Personal Notifications
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    {notificationsCount} notifications
                  </span>
                </div>
              </label>

              <label className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition-colors flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes('user_packs')}
                  onChange={(e) =>
                    setSelectedCategories((prev) =>
                      e.target.checked
                        ? [...prev, 'user_packs']
                        : prev.filter((k) => k !== 'user_packs')
                    )
                  }
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Personal Draft Packs</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Private unshared draft packs
                  </span>
                </div>
              </label>

              <label className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition-colors flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes('signature_profile')}
                  onChange={(e) =>
                    setSelectedCategories((prev) =>
                      e.target.checked
                        ? [...prev, 'signature_profile']
                        : prev.filter((k) => k !== 'signature_profile')
                    )
                  }
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Signature Profile</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Saved signature assets
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsReviewOpen(true)}
                disabled={selectedCategories.length === 0}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Review Data Removal
              </button>
            </div>
          </div>

          {/* DANGER ZONE: DELETE ACCOUNT */}
          <div className="rounded-3xl border border-rose-200 bg-rose-50/30 p-6 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950">Danger Zone: Delete Account</h3>
                <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                  Permanently remove this account's access and personal data while preserving organizational history.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-slate-900">Account Lifecycle Termination</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Will revoke login authorization and clean removable private records. Historical reports remain intact.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Delete Account…
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Changes Confirmation Modal */}
      <ReviewChangesDialog
        isOpen={isReviewOpen}
        title={`Review Data Removal: ${userName}`}
        description={`You have chosen to clean selected personal data categories for ${userName}. Review the impact below before continuing.`}
        targetName={userName}
        willRemove={selectedCategories.map((c) => ({
          label: c.replace(/_/g, ' '),
        }))}
        willRemain={[
          { label: 'User account credentials and identity' },
          { label: 'Created organizational reports', count: reportsCreatedCount },
          { label: 'Received and signed reports', count: reportsReceivedCount },
          { label: 'Form templates and revisions', count: templatesCreatedCount },
          { label: 'Historical audit log entries' },
        ]}
        confirmationPhrase="CLEAN SELECTED ACCOUNT DATA"
        isExecuting={isExecutingCleanup}
        onConfirm={handleExecuteCleanup}
        onClose={() => setIsReviewOpen(false)}
      />

      {/* Full Account Deletion Modal (Disabled / Lifecycle Impact Preview) */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        userName={userName}
        userEmail={userEmail}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
