import React, { useState } from 'react';
import type { WidgetTemplate } from '../../types';
import { useApp } from '../../context/AppContext';
import { RequestCommentThread } from './RequestCommentThread';
import { ApproveConfirmModal } from './ApproveConfirmModal';
import { RejectModal } from './RejectModal';
import { ReturnTemplateModal } from './ReturnTemplateModal';
import { DynamicTemplateRenderer } from '../dynamic-template/DynamicTemplateRenderer';
import { X, CheckCircle2, XCircle, Clock, Sparkles, User as UserIcon, Calendar, FileText, RotateCcw } from 'lucide-react';

interface ApprovalDetailDrawerProps {
  template: WidgetTemplate;
  onClose: () => void;
}

export const ApprovalDetailDrawer: React.FC<ApprovalDetailDrawerProps> = ({ template, onClose }) => {
  const {
    categories,
    approvalRecords,
    approveTemplate,
    rejectTemplate,
    returnTemplateForRevision,
    currentUser,
    hasPermission,
  } = useApp();

  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const categoryName = categories.find((c) => c.id === template.categoryId)?.name || 'General';

  // Filter audit history records for this template
  const history = approvalRecords.filter((r) => r.templateId === template.id);

  // The pending-approval collection is already RLS-filtered by the canonical
  // reviewer helper. A ROLE_QUEUE item may therefore be unclaimed (null
  // reviewer) and still actionable by this eligible reviewer.
  const canReviewTemplate =
    template.status === 'Pending Approval' &&
    template.createdById !== currentUser.id &&
    (!template.requestedApprovalFromUserId || template.requestedApprovalFromUserId === currentUser.id) &&
    hasPermission('template_approvals.view');

  const handleApproveConfirm = () => {
    approveTemplate(template.id);
    setShowApproveConfirm(false);
    onClose();
  };

  const handleRejectConfirm = (reason: string) => {
    rejectTemplate(template.id, reason);
    setShowRejectModal(false);
    onClose();
  };



  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-fade-in">
        <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-slide-left">
          {/* Header */}
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Pending {currentUser.role} Review
                </span>
                <span className="text-xs font-semibold text-slate-500">{categoryName}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{template.name}</h2>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Requester Metadata */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Submitted By</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    {template.createdByName} ({template.createdByRole})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Submitted Date</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5 justify-end">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(template.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Description</span>
                <p className="text-slate-800 leading-relaxed mt-0.5">{template.description}</p>
              </div>

              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {template.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-white text-slate-700 rounded text-[10px] font-medium border border-slate-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Visual Widget Preview */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Widget Visual Layout Preview
              </h3>
              <DynamicTemplateRenderer
                template={template}
                values={{}}
                mode="readOnly"
              />
            </div>

            {/* Audit History Timeline */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Audit Trail History
              </h3>

              <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                {history.map((record) => (
                  <div key={record.id} className="relative pl-4 text-xs space-y-1">
                    <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                    <div className="font-bold text-slate-900">
                      {record.personName} <span className="text-slate-500 font-normal">({record.role})</span>
                    </div>
                    <div className="text-indigo-700 font-semibold">{record.action}</div>
                    {record.comment && (
                      <p className="text-slate-600 italic text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                        "{record.comment}"
                      </p>
                    )}
                    <div className="text-[10px] text-slate-400">{new Date(record.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Comment Thread */}
            <div className="pt-2 border-t border-slate-200">
              <RequestCommentThread templateId={template.id} />
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>

            {canReviewTemplate && (hasPermission('template_approvals.approve') || hasPermission('template_approvals.reject')) && (
              <div className="flex items-center gap-2">
                {hasPermission('template_approvals.reject') && <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>}

                {hasPermission('template_approvals.reject') && hasPermission('template_approvals.approve') && <button
                  onClick={() => setShowReturnModal(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Return for Revision</span>
                </button>}

                {hasPermission('template_approvals.approve') && <button
                  onClick={() => setShowApproveConfirm(true)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Publish</span>
                </button>}
              </div>
            )}
          </div>
        </div>
      </div>

      {showApproveConfirm && (
        <ApproveConfirmModal
          template={template}
          onConfirm={handleApproveConfirm}
          onClose={() => setShowApproveConfirm(false)}
        />
      )}

      {showRejectModal && (
        <RejectModal
          template={template}
          onConfirm={handleRejectConfirm}
          onClose={() => setShowRejectModal(false)}
        />
      )}
      {showReturnModal && (
        <ReturnTemplateModal
          template={template}
          onConfirm={(reason) => {
            void returnTemplateForRevision(template.id, reason);
            setShowReturnModal(false);
          }}
          onClose={() => setShowReturnModal(false)}
        />
      )}
    </>
  );
};
