import React from 'react';
import type { WidgetTemplate } from '../../types';
import { useApp } from '../../context/AppContext';
import { RequestCommentThread } from '../approvals/RequestCommentThread';
import { X, Clock, CheckCircle2, XCircle, AlertCircle, Edit3, Send, Shield, User as UserIcon, Calendar, FileText, RotateCcw } from 'lucide-react';

interface RequestDetailDrawerProps {
  template: WidgetTemplate;
  onClose: () => void;
}

export const RequestDetailDrawer: React.FC<RequestDetailDrawerProps> = ({ template, onClose }) => {
  const {
    categories,
    approvalRecords,
    openAddTemplateModal,
    submitTemplateForApproval,
    currentUser,
  } = useApp();

  const categoryName = categories.find((c) => c.id === template.categoryId)?.name || 'General';

  // Filter audit trail for this template
  const history = approvalRecords.filter((r) => r.templateId === template.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Approved
          </span>
        );
      case 'Pending Approval':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            Pending Approval
          </span>
        );
      case 'Rejected':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-rose-600" />
            Rejected
          </span>
        );
      case 'Returned for Revision':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-amber-600" />
            Returned for Revision
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-1 rounded-full">
            {status}
          </span>
        );
    }
  };

  const handleContinueEditing = () => {
    onClose();
    openAddTemplateModal(template);
  };

  const handleSubmitDraftDirectly = () => {
    submitTemplateForApproval(
      {
        name: template.name,
        categoryId: template.categoryId,
        description: template.description,
        tags: template.tags,
        layoutType: template.layoutType,
      },
      template.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-slide-left">
        {/* Drawer Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge(template.status === 'Draft' && template.returnedAt ? 'Returned for Revision' : template.status)}
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
          {/* Rejection Alert if Rejected */}
          {template.status === 'Rejected' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Template Submission Rejected
              </div>
              <p className="text-rose-700">
                {template.rejectionReason || 'The approver has requested revisions to this template configuration before approval.'}
              </p>
            </div>
          )}

          {template.status === 'Draft' && template.returnedAt && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                Template Returned for Revision
              </div>
              <p className="text-amber-700">{template.returnReason || 'Please update this template before resubmitting it for approval.'}</p>
            </div>
          )}

          {/* Details Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Description</span>
              <p className="text-slate-800 leading-relaxed mt-0.5">{template.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Submitted By</span>
                <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  {template.createdByName} ({template.createdByRole})
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Target Approver</span>
                <span className="font-bold text-indigo-700 flex items-center gap-1 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-500" />
                  {template.requestedApprovalFromName || (template.status === 'Approved' ? 'Published' : 'Manager / Director')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-200/80">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Created: {new Date(template.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Updated: {new Date(template.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2">Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {template.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Workflow Audit Trail History */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Submission Audit History
            </h4>

            {history.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg text-slate-400 text-xs italic text-center">
                No audit records logged for this draft.
              </div>
            ) : (
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
            )}
          </div>

          {/* Request Comment Thread */}
          <div className="pt-4 border-t border-slate-200">
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

          {/* Draft Actions */}
          {template.status === 'Draft' && template.createdById === currentUser.id && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleContinueEditing}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>{template.returnedAt ? 'Edit & Resubmit' : 'Continue Editing'}</span>
              </button>
              {!template.returnedAt && (
                <button
                  onClick={handleSubmitDraftDirectly}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit for Approval</span>
                </button>
              )}
            </div>
          )}

          {/* Rejected Actions */}
          {template.status === 'Rejected' && template.createdById === currentUser.id && (
            <button
              onClick={handleContinueEditing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit & Resubmit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
