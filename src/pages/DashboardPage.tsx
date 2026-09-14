import React from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { QuickActions } from '../components/dashboard/QuickActions';
import {
  Library,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  DollarSign,
  Users,
  BarChart3,
  Terminal,
  Layers,
  FileSpreadsheet,
  Shield,
  XCircle,
  Eye,
  Plus,
  FileText,
  StickyNote,
} from 'lucide-react';
import { WorkflowMonitor } from '../components/dashboard/WorkflowMonitor';

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    getApprovedTemplates,
    getMyRequestsForUser,
    getPendingApprovalsForUser,
    getReportsAwaitingMyReview,
    notifications,
    templates,
    reports,
    setActiveView,
    openFillReportModal,
    openReportViewModal,
    openSignReportModal,
    openRejectReportModal,
    openAddTemplateModal,
    openTemplateDetail,
    openApprovalDetail,
    hasPermission,
  } = useApp();

  const approvedTemplates = getApprovedTemplates();
  const recentTemplates = [...approvedTemplates]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const myReports = reports.filter((r) => r.createdById === currentUser.id);
  const myTemplateRequests = getMyRequestsForUser();
  const reportsAwaitingMyReview = getReportsAwaitingMyReview();
  const pendingTemplateApprovals = getPendingApprovalsForUser();
  const unreadNotifications = notifications.filter((n) => n.userId === currentUser.id && !n.read);

  const returnedReports = reports.filter(
    (r) => r.createdById === currentUser.id && r.status === 'Returned'
  );

  const userRelevantReports = reports
    .filter((r) => r.createdById === currentUser.id || r.assignments?.some((a) => a.recipientUserId === currentUser.id) || r.sentToId === currentUser.id)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'cat-finance':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'cat-hr':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'cat-analytics':
        return <BarChart3 className="w-4 h-4 text-purple-600" />;
      case 'cat-devtools':
        return <Terminal className="w-4 h-4 text-amber-600" />;
      default:
        return <Layers className="w-4 h-4 text-indigo-600" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {currentUser.name.split(' ')[0]}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {currentUser.role}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Here's an overview of your report activity and pending actions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveView('templates')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Browse Report Templates</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5 Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Approved Report Templates */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Approved Templates</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Library className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{approvedTemplates.length}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Firm-wide templates
            </div>
          </div>
        </div>

        {/* Card 2: My Reports */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">My Reports</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{myReports.length}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Authored reports</div>
          </div>
        </div>

        {/* Card 3: Template Requests */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Template Requests</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{myTemplateRequests.length}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Submitted for approval</div>
          </div>
        </div>

        {/* Card 4: Reports Awaiting My Review */}
        <div
          className={`bg-white p-4 rounded-xl border shadow-xs transition-all ${
            reportsAwaitingMyReview.length > 0
              ? 'border-emerald-300 ring-2 ring-emerald-500/10'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Awaiting My Review</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                reportsAwaitingMyReview.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{reportsAwaitingMyReview.length}</div>
            <div className="text-[11px] font-medium mt-1">
              {reportsAwaitingMyReview.length > 0 ? (
                <span className="text-emerald-700 font-bold">Needs digital signature</span>
              ) : (
                <span className="text-slate-400">Review inbox clear</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 5: Pending Template Approvals */}
        <div
          className={`bg-white p-4 rounded-xl border shadow-xs transition-all ${
            pendingTemplateApprovals.length > 0
              ? 'border-amber-300 ring-2 ring-amber-500/10'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Approvals</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                pendingTemplateApprovals.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{pendingTemplateApprovals.length}</div>
            <div className="text-[11px] font-medium mt-1">
              {!hasPermission('template_approvals.view') ? (
                <span className="text-slate-400">Template requests</span>
              ) : pendingTemplateApprovals.length > 0 ? (
                <span className="text-amber-700 font-semibold">Requires template review</span>
              ) : (
                <span className="text-emerald-600">All clear</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <QuickActions
        actions={[
          {
            title: 'Create New Template',
            description: 'Start a template in the existing builder.',
            icon: Plus,
            onClick: () => openAddTemplateModal(),
            visible: hasPermission('templates.create') && hasPermission('studio.access'),
          },
          {
            title: 'Create Report',
            description: 'Choose an approved template and fill a report.',
            icon: FileSpreadsheet,
            onClick: () => setActiveView('templates'),
            visible: hasPermission('templates.use') && hasPermission('reports.create'),
          },
          {
            title: 'My Requests',
            description: 'Track templates submitted for approval.',
            icon: FileText,
            onClick: () => setActiveView('my-requests'),
            visible: hasPermission('templates.create') || hasPermission('templates.edit_own_draft'),
            badge: myTemplateRequests.length > 0 ? `${myTemplateRequests.length} pending` : undefined,
          },
          {
            title: 'Approvals',
            description: 'Open the template approval inbox.',
            icon: Clock,
            onClick: () => setActiveView('approvals'),
            visible: hasPermission('template_approvals.view'),
            badge: pendingTemplateApprovals.length > 0 ? `${pendingTemplateApprovals.length} pending` : undefined,
          },
          {
            title: 'Sticky Notes',
            description: 'Capture a quick personal note.',
            icon: StickyNote,
            onClick: () => setActiveView('sticky-notes'),
            visible: true,
          },
        ]}
      />

      {/* Attention Required Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Attention Required
          </h3>
        </div>

        <div className="p-4 space-y-3">
          {reportsAwaitingMyReview.length === 0 &&
          pendingTemplateApprovals.length === 0 &&
          returnedReports.length === 0 &&
          unreadNotifications.length === 0 ? (
            <div className="text-slate-500 text-xs flex items-center gap-2 py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>You're all caught up! No pending items require your immediate action.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {reportsAwaitingMyReview.length > 0 && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-950 block">
                      {reportsAwaitingMyReview.length} {reportsAwaitingMyReview.length === 1 ? 'report' : 'reports'} awaiting your signature
                    </span>
                    <span className="text-[11px] text-emerald-700">Sent to you for review and sign-off</span>
                  </div>
                  <button
                    onClick={() => setActiveView('reports')}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs cursor-pointer shadow-xs"
                  >
                    Review now
                  </button>
                </div>
              )}

              {pendingTemplateApprovals.length > 0 && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-950 block">
                      {pendingTemplateApprovals.length} template {pendingTemplateApprovals.length === 1 ? 'request' : 'requests'} awaiting your approval
                    </span>
                    <span className="text-[11px] text-amber-700">Submitted by your team members</span>
                  </div>
                  <button
                    onClick={() => setActiveView('approvals')}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs cursor-pointer shadow-xs"
                  >
                    Review now
                  </button>
                </div>
              )}

              {returnedReports.length > 0 && (
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-950 block">
                      {returnedReports.length} {returnedReports.length === 1 ? 'report' : 'reports'} returned for changes
                    </span>
                    <span className="text-[11px] text-rose-700">Review feedback and resubmit</span>
                  </div>
                  <button
                    onClick={() => setActiveView('reports')}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded text-xs cursor-pointer shadow-xs"
                  >
                    View feedback
                  </button>
                </div>
              )}

              {unreadNotifications.length > 0 && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-indigo-950 block">
                      {unreadNotifications.length} unread notifications
                    </span>
                    <span className="text-[11px] text-indigo-700">Check recent comments and status updates</span>
                  </div>
                  <button
                    onClick={() => setActiveView('notifications')}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-xs cursor-pointer shadow-xs"
                  >
                    View alerts
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Reports Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Recent Generated Reports
                </h3>
              </div>
              <button
                onClick={() => setActiveView('reports')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                View all reports →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {userRelevantReports.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No generated reports yet. Click "Browse Report Templates" to start.
                </div>
              ) : (
                userRelevantReports.map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() => openReportViewModal(rep)}
                    className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {rep.title}
                        </h4>
                        <StatusBadge status={rep.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 truncate">
                        <span>Template: {rep.templateName}</span>
                        <span>•</span>
                        <span>Author: {rep.createdByName}</span>
                        <span>•</span>
                        <span>Updated {formatRelativeTime(rep.updatedAt)}</span>
                      </div>
                      {rep.status === 'Rejected' && rep.rejectionReason && (
                        <div className="mt-1 text-[11px] text-rose-700 font-medium truncate max-w-full">Reason: {rep.rejectionReason}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {rep.status === 'Sent' && (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(rep.id) || rep.signatureAssignments?.some((m) => m.recipientUserId === currentUser.id && m.sendCycleId === rep.currentSendCycleId)) && (
                        <button
                          onClick={() => openSignReportModal(rep)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Sign</span>
                        </button>
                      )}
                      {rep.status === 'Sent' && hasPermission('reports.reject') && rep.assignments?.some((a) => a.recipientUserId === currentUser.id && a.sendCycleId === rep.currentSendCycleId && a.assignmentStatus === 'pending' && rep.signatureAssignments?.some((m) => m.reportAssignmentId === a.id && m.recipientUserId === currentUser.id && m.sendCycleId === rep.currentSendCycleId)) && (
                        <button onClick={() => openRejectReportModal(rep)} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"><XCircle className="w-3.5 h-3.5" /><span>Reject</span></button>
                      )}

                      <button
                        onClick={() => openReportViewModal(rep)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="View Report Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Popular Report Templates */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Library className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Popular Report Templates
                </h3>
              </div>
              <button
                onClick={() => setActiveView('templates')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                View all templates →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-lg bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors mt-0.5">
                      {getCategoryIcon(tpl.categoryId)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {tpl.name}
                        </h4>
                        <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.2 rounded border border-slate-200">
                          {tpl.version || 'v1.0'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{tpl.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => openFillReportModal(tpl)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Use Template</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <WorkflowMonitor currentUser={currentUser} reports={reports} templates={templates} pendingTemplateApprovals={pendingTemplateApprovals} myTemplateRequests={myTemplateRequests} setActiveView={setActiveView} openReportViewModal={openReportViewModal} openTemplateDetail={openTemplateDetail} openAddTemplateModal={openAddTemplateModal} openApprovalDetail={openApprovalDetail} hasPermission={hasPermission} />
      </div>
    </div>
  );
};
