import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApproveConfirmModal } from '../components/approvals/ApproveConfirmModal';
import { RejectModal } from '../components/approvals/RejectModal';
import { ReturnTemplateModal } from '../components/approvals/ReturnTemplateModal';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Eye,
  DollarSign,
  Users,
  BarChart3,
  Terminal,
  Layers,
  Inbox,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import type { WidgetTemplate } from '../types';

export const ApprovalsPage: React.FC = () => {
  const {
    currentUser,
    getPendingApprovalsForUser,
    categories,
    approvalRecords,
    openApprovalDetail,
    approveTemplate,
    rejectTemplate,
    returnTemplateForRevision,
    claimTemplateReview,
    hasPermission,
  } = useApp();

  const pendingApprovals = getPendingApprovalsForUser();

  const [confirmApproveTemplate, setConfirmApproveTemplate] = useState<WidgetTemplate | null>(null);
  const [rejectTargetTemplate, setRejectTargetTemplate] = useState<WidgetTemplate | null>(null);
  const [returnTargetTemplate, setReturnTargetTemplate] = useState<WidgetTemplate | null>(null);

  const getCategoryName = (catId: string) => {
    return categories.find((c) => c.id === catId)?.name || 'General';
  };

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

  // Metrics for top bar
  const approvedTodayCount = approvalRecords.filter(
    (r) => r.personName === currentUser.name && r.action === 'Approved'
  ).length;

  const rejectedTodayCount = approvalRecords.filter(
    (r) => r.personName === currentUser.name && r.action === 'Rejected'
  ).length;

  const getOldestPendingTime = () => {
    if (pendingApprovals.length === 0) return 'None';
    const sorted = [...pendingApprovals].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const oldestDate = new Date(sorted[0].createdAt);
    return oldestDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-600" />
            Approval Inbox ({pendingApprovals.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review template requests awaiting your decision.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-full flex items-center gap-1.5">
            Role: {currentUser.role}
          </span>
        </div>
      </div>

      {/* Summary Metrics Bar for Manager/Director */}
      {hasPermission('template_approvals.view') && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 block">Pending Requests</span>
            <div className="text-xl font-bold text-amber-600 mt-1">{pendingApprovals.length}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 block">Oldest Pending</span>
            <div className="text-sm font-bold text-slate-800 mt-2">{getOldestPendingTime()}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 block">Approved Today</span>
            <div className="text-xl font-bold text-emerald-600 mt-1">{approvedTodayCount}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 block">Rejected Today</span>
            <div className="text-xl font-bold text-rose-600 mt-1">{rejectedTodayCount}</div>
          </div>
        </div>
      )}

      {/* Main Inbox Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {!hasPermission('template_approvals.view') ? (
          /* Employee Empty/Access State */
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No approval actions assigned</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Approval requests assigned to your role will appear here when Template Approval access is enabled.
            </p>
          </div>
        ) : pendingApprovals.length === 0 ? (
          /* Manager/Director Inbox Empty State */
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
            <h3 className="text-sm font-bold text-slate-800">No pending approvals</h3>
            <p className="text-xs text-slate-500">
              All template requests assigned to {currentUser.name} ({currentUser.role}) have been reviewed!
            </p>
          </div>
        ) : (
          /* Pending Requests Inbox Cards */
          <div className="divide-y divide-slate-100">
            {pendingApprovals.map((req) => {
              const isUnclaimedQueueItem = !req.requestedApprovalFromUserId;
              const canReviewThisTemplate =
                req.status === 'Pending Approval' &&
                req.createdById !== currentUser.id &&
                (!req.requestedApprovalFromUserId || req.requestedApprovalFromUserId === currentUser.id) &&
                hasPermission('template_approvals.view');

              return (
                <div
                  key={req.id}
                  className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 mt-0.5 border border-amber-200">
                      {getCategoryIcon(req.categoryId)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{req.name}</h3>
                        {isUnclaimedQueueItem ? (
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Users className="w-3 h-3 text-indigo-600" />
                            Role Queue (Unclaimed)
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            Pending Your Review
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">{req.description}</p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span className="font-semibold text-slate-800">
                          Submitted by: {req.createdByName} ({req.createdByRole})
                        </span>
                        <span>•</span>
                        <span>Category: {getCategoryName(req.categoryId)}</span>
                        <span>•</span>
                        <span className="text-slate-400">
                          {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {isUnclaimedQueueItem && hasPermission('template_approvals.approve') && (
                      <button
                        onClick={() => claimTemplateReview(req.id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Take this request for review"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Take for Review</span>
                      </button>
                    )}
                    {canReviewThisTemplate && (
                      <>
                        <button
                          onClick={() => openApprovalDetail(req)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                          <span>Review</span>
                        </button>

                        {hasPermission('template_approvals.reject') && (
                          <button
                            onClick={() => setRejectTargetTemplate(req)}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-rose-200"
                            title="Reject Template"
                          >
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span className="hidden sm:inline">Reject</span>
                          </button>
                        )}

                        {hasPermission('template_approvals.reject') && hasPermission('template_approvals.approve') && (
                          <button
                            onClick={() => setReturnTargetTemplate(req)}
                            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-amber-200"
                            title="Return for Revision"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            <span className="hidden sm:inline">Return</span>
                          </button>
                        )}

                        {hasPermission('template_approvals.approve') && (
                          <button
                            onClick={() => setConfirmApproveTemplate(req)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Approve Template"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Direct Quick Action Modals */}
      {confirmApproveTemplate && (
        <ApproveConfirmModal
          template={confirmApproveTemplate}
          onConfirm={() => {
            approveTemplate(confirmApproveTemplate.id);
            setConfirmApproveTemplate(null);
          }}
          onClose={() => setConfirmApproveTemplate(null)}
        />
      )}

      {rejectTargetTemplate && (
        <RejectModal
          template={rejectTargetTemplate}
          onConfirm={(reason) => {
            rejectTemplate(rejectTargetTemplate.id, reason);
            setRejectTargetTemplate(null);
          }}
          onClose={() => setRejectTargetTemplate(null)}
        />
      )}
      {returnTargetTemplate && (
        <ReturnTemplateModal
          template={returnTargetTemplate}
          onConfirm={(reason) => {
            void returnTemplateForRevision(returnTargetTemplate.id, reason);
            setReturnTargetTemplate(null);
          }}
          onClose={() => setReturnTargetTemplate(null)}
        />
      )}
    </div>
  );
};
