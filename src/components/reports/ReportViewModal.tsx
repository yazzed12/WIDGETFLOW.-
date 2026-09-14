import React from 'react';
import type { ReportInstance } from '../../types';
import { useApp } from '../../context/AppContext';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { ReportCommentThread } from './ReportCommentThread';
import { DynamicTemplateRenderer } from '../dynamic-template/DynamicTemplateRenderer';
import { normalizeReportTemplateSnapshot } from '../../shared/signatureResolver';
import {
  X,
  FileText,
  CheckCircle2,
  User as UserIcon,
  Calendar,
  Send,
  Shield,
  RotateCcw,
  Clock,
  AlertCircle,
  XCircle,
  FileCheck,
  Edit3,
} from 'lucide-react';

interface ReportViewModalProps {
  report: ReportInstance;
  onClose: () => void;
}

export const ReportViewModal: React.FC<ReportViewModalProps> = ({ report, onClose }) => {
  const {
    currentUser,
    templates,
    openSendReportModal,
    openReturnReportModal,
    openRejectReportModal,
    openSignReportModal,
    openFillReportModal,
    markReportCompleted,
    hasPermission,
  } = useApp();
  const { isSettingEnabled } = useSystemConfig();

  const template = (report as any).templateSnapshot
    ? normalizeReportTemplateSnapshot((report as any).templateSnapshot)
    : templates.find((t) => t.id === report.templateId);

  const isAuthor = report.createdById === currentUser.id;
  const isSupabaseReport = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(report.id);
  const isAssignedRecipient = isSupabaseReport
    ? report.status === 'Sent' && !report.lockedAt && !!report.currentSendCycleId && !!report.assignments?.some((assignment) => assignment.recipientUserId === currentUser.id && assignment.sendCycleId === report.currentSendCycleId && assignment.assignmentStatus === 'pending' && report.signatureAssignments?.some((mapping) => mapping.reportAssignmentId === assignment.id && mapping.recipientUserId === currentUser.id && mapping.sendCycleId === report.currentSendCycleId))
    : report.sentToId === currentUser.id;
  const isMappedSigner = !!report.assignments?.some((assignment) =>
    assignment.recipientUserId === currentUser.id
    && assignment.sendCycleId === report.currentSendCycleId
    && assignment.assignmentStatus === 'pending'
    && report.signatureAssignments?.some((mapping) => mapping.reportAssignmentId === assignment.id && mapping.recipientUserId === currentUser.id && mapping.sendCycleId === report.currentSendCycleId)
  );

  const components: any[] = [];
  if (template?.components) components.push(...template.components);
  if (template?.dynamicSections) {
    template.dynamicSections.forEach((s: any) => {
      if (s.components) components.push(...s.components);
    });
  }
  if (template?.fields) components.push(...template.fields);

  const hasSenderSigRequirement = components.some(
    (c: any) => c.type === 'signature' && (c.signatureConfig?.signatureRole || '').toLowerCase() === 'sender'
  );
  const activeSenderSig = (report.activeSignatures || []).find((s: any) => s.signatureRole === 'sender');

  const getFieldValueLabel = (fieldId: string) => {
    if (!template || !(template as any).fields) return fieldId;
    const field = (template as any).fields.find((f: any) => f.id === fieldId);
    return field ? field.label : fieldId;
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString();
  };

  const getTimelineItems = () => {
    const items: Array<{ id: string; personName: string; role: string; action: string; comment?: string; timestamp: string; rawTime: number }> = [];
    const seenKeys = new Set<string>();

    if (report.auditHistory && Array.isArray(report.auditHistory)) {
      report.auditHistory.forEach((rec: any, idx: number) => {
        let name = rec.personName || rec.person_name;
        if (!name || name === '(sender)' || name === '(receiver)') {
          name = report.createdByName || 'User';
        }
        let role = rec.role || 'Role';
        const formattedTime = formatDate(rec.timestamp);
        const timeMs = rec.timestamp ? new Date(rec.timestamp).getTime() : idx;
        const key = `${name}-${rec.action}-${rec.timestamp || idx}`;
        items.push({
          id: rec.id || `aud-${idx}`,
          personName: name,
          role,
          action: rec.action || 'Event',
          comment: rec.comment,
          timestamp: formattedTime,
          rawTime: isNaN(timeMs) ? idx : timeMs,
        });
        seenKeys.add(key);
      });
    }

    if (report.activeSignatures && Array.isArray(report.activeSignatures)) {
      report.activeSignatures.forEach((sig: any, idx: number) => {
        let name = sig.signedByName || sig.signerName;
        if (!name || name === '(sender)' || name === '(receiver)') {
          name = report.sentToName || report.createdByName || 'Signer';
        }
        let role = sig.signedByRole || sig.signatureRole || 'Signer';
        const rawTs = sig.signedAt || sig.timestamp;
        const key = `${name}-Signed-${rawTs || idx}`;
        if (!seenKeys.has(key)) {
          const formattedTime = formatDate(rawTs);
          const timeMs = rawTs ? new Date(rawTs).getTime() : (Date.now() + idx);
          const verId = sig.verificationId || sig.signedContentHash;
          items.push({
            id: sig.id || `sig-${idx}`,
            personName: name,
            role,
            action: `Signed Report`,
            comment: verId ? `Digital Signature Verification ID: ${verId}` : undefined,
            timestamp: formattedTime,
            rawTime: isNaN(timeMs) ? Date.now() + idx : timeMs,
          });
          seenKeys.add(key);
        }
      });
    }

    return items.sort((a, b) => a.rawTime - b.rawTime);
  };

  const timelineItems = getTimelineItems();
  const visibleAssignments = report.assignments?.filter((assignment) => !report.currentSendCycleId || assignment.sendCycleId === report.currentSendCycleId) || [];
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Signed':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Digitally Signed
          </span>
        );
      case 'Sent':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Send className="w-3.5 h-3.5" />
            Sent for Signature
          </span>
        );
      case 'Returned':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" />
            Returned for Changes
          </span>
        );
      case 'Rejected':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Report Rejected
          </span>
        );
      case 'Completed':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
            Completed
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Draft
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-scale-up">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">{report.title}</h2>
                {getStatusBadge(report.status)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Template Used: <strong className="text-slate-800">{report.templateName}</strong> ({report.categoryName})
              </p>
              {report.displayId && <p className="text-[11px] font-mono text-slate-400 mt-1">{report.displayId}</p>}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Metadata Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Prepared By</span>
              <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                {report.createdByName} ({report.createdByRole})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date Created</span>
              <span className="font-medium text-slate-700 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(report.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sent To</span>
              <span className="font-bold text-indigo-700 mt-0.5 block truncate">
                {report.sentToName || 'Not Sent Yet'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Last Updated</span>
              <span className="font-medium text-slate-700 mt-0.5 block">
                {new Date(report.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Returned Alert if Returned */}
          {report.status === 'Returned' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Changes Requested by Reviewer
              </div>
              <p className="text-amber-800 bg-white p-2.5 rounded border border-amber-200/80 leading-relaxed font-medium">
                "{report.returnReason || 'Please review feedback notes and resubmit report.'}"
              </p>
            </div>
          )}

          {/* Rejected Alert if Rejected */}
          {report.status === 'Rejected' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <XCircle className="w-4 h-4 text-rose-600" />
                Report Rejected by Reviewer
              </div>
              <p className="text-rose-800 bg-white p-2.5 rounded border border-rose-200/80 leading-relaxed font-medium">
                "{report.rejectionReason || 'No rejection reason provided.'}"
              </p>
            </div>
          )}

          {/* Digital Signature Card if Signed */}
          {report.status === 'Signed' && (report.signature || (report.activeSignatures && report.activeSignatures.length > 0)) && (
            <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  Digitally Signed & Verified Record
                </div>
                <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-emerald-200/80">
                <div>
                  <span className="text-[10px] text-emerald-700 font-semibold block uppercase">Signed By</span>
                  <span className="font-bold text-emerald-950 mt-0.5 block">
                    {report.signature?.signedByName || report.activeSignatures?.[0]?.signedByName || report.sentToName || 'Signer'} ({report.signature?.signedByRole || report.activeSignatures?.[0]?.signedByRole || 'Role'})
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-emerald-700 font-semibold block uppercase">Signed On</span>
                  <span className="font-medium text-emerald-900 mt-0.5 block">
                    {formatDate(report.signature?.signedAt || report.activeSignatures?.[0]?.signedAt || report.updatedAt)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-emerald-700 font-semibold block uppercase">Verification ID</span>
                  <span className="font-mono font-bold text-emerald-800 mt-0.5 block bg-white px-2 py-0.5 rounded border border-emerald-200 w-fit text-[11px]">
                    {report.signature?.verificationId || report.activeSignatures?.[0]?.verificationId || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Workflow Execution Progress Timeline */}
          {report.workflowDetails?.snapshot && (
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Workflow Execution Progress</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {report.workflowDetails.instance?.status || 'Active'}
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto py-2">
                {report.workflowDetails.snapshot.steps.map((step: any, idx: number) => {
                  const isCurrent = report.workflowDetails?.instance?.currentStepId === step.id;
                  const isCompleted =
                    report.workflowDetails?.history?.some((h: any) => h.stepId === step.id && (h.action === 'Approve' || h.action === 'Sign' || h.action === 'Started')) &&
                    !isCurrent;

                  return (
                    <React.Fragment key={step.id}>
                      <div
                        className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                          isCurrent
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md scale-105'
                            : isCompleted
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isCompleted ? '✓' : isCurrent ? '●' : '○'} {step.name}
                      </div>
                      {idx < report.workflowDetails.snapshot.steps.length - 1 && (
                        <span className="text-slate-600 font-extrabold text-xs">→</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {visibleAssignments.length > 0 && (
            <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Signature Status</h3>
                <span className="text-xs font-bold text-slate-700">{visibleAssignments.filter((a) => a.assignmentStatus === 'signed').length} / {visibleAssignments.length} signed</span>
              </div>
              <div className="space-y-2">
                {visibleAssignments.map((assignment) => {
                  const signature = (report.signatureHistory || []).find((s: any) => s.reportAssignmentId === assignment.id || s.assignmentId === assignment.id);
                  const signed = assignment.assignmentStatus === 'signed';
                  return (
                    <div key={assignment.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="min-w-0"><div className="font-bold text-slate-900 truncate">{assignment.recipientName || 'Recipient'}</div><div className="text-[10px] text-slate-500">{assignment.recipientRoleName || assignment.recipientRoleKey || 'Role'}</div></div>
                      <div className="text-right shrink-0"><div className={`font-bold ${signed ? 'text-emerald-700' : 'text-amber-700'}`}>{signed ? '✓ Digitally Signed' : (assignment.assignmentStatus || 'Pending')}</div>{signed && signature && <div className="text-[10px] text-slate-500">{signature.verificationId || 'Verified'}{signature.signedAt ? ` · ${new Date(signature.signedAt).toLocaleString()}` : ''}</div>}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Template Structure / Values */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
              Report Content &amp; Data Fields
            </h3>

            {template ? (
              <DynamicTemplateRenderer
                template={template}
                values={report.data || {}}
                mode="readOnly"
                activeSignatures={report.activeSignatures}
                signatureHistory={report.signatureHistory}
                currentUser={currentUser}
                reportId={report.id}
              />
            ) : (
              <div className="space-y-3">
                {Object.entries(report.data || {}).map(([key, val]) => (
                  <div key={key} className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block">
                      {getFieldValueLabel(key)}
                    </span>
                    <span className="font-semibold text-slate-800 text-xs mt-0.5 block whitespace-pre-wrap">
                      {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || '—')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit History Timeline */}
          {hasPermission('audit_history.view') && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Report Audit Trail Timeline
              </h3>

              {timelineItems.length > 0 ? (
                <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                  {timelineItems.map((record) => (
                    <div key={record.id} className="relative pl-4 text-xs space-y-1">
                      <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                      <div className="font-bold text-slate-900">
                        {record.personName} <span className="text-slate-500 font-normal">({record.role})</span>
                      </div>
                      <div className="text-indigo-700 font-semibold">{record.action}</div>
                      {record.comment && (
                        <p className="text-slate-600 italic text-[11px] bg-slate-50 p-2 rounded border border-slate-100 font-medium">
                          "{record.comment}"
                        </p>
                      )}
                      {record.timestamp && (
                        <div className="text-[10px] text-slate-400 font-medium">{record.timestamp}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs italic">No audit records logged.</p>
              )}
            </div>
          )}

          {/* Report Comments Thread */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Activity &amp; Review Comments</h3>
            <ReportCommentThread reportId={report.id} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {/* Author Actions */}
            {isAuthor && report.status !== 'Signed' && report.status !== 'Rejected' && (
              <>
                {(report.status === 'Draft' || report.status === 'Returned') && template && hasPermission('reports.edit_draft') && (
                  <button
                    onClick={() => {
                      onClose();
                      openFillReportModal(template, report);
                    }}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Edit Report</span>
                  </button>
                )}

                {report.status === 'Draft' && hasPermission('reports.complete') && (
                  <button
                    onClick={() => markReportCompleted(report.id)}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Mark Completed</span>
                  </button>
                )}

                {(report.status === 'Completed' || report.status === 'Returned') && hasPermission('reports.send') && (
                  <button
                    onClick={() => {
                      onClose();
                      openSendReportModal(report);
                    }}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>{report.status === 'Returned' ? 'Resend Report' : 'Send Report'}</span>
                  </button>
                )}
              </>
            )}

            {/* Recipient Actions */}
            {isAssignedRecipient && report.status === 'Sent' && (
              <>
                {isSettingEnabled('allow_rejection') && isSettingEnabled('workflow.report_rejection') && hasPermission('reports.reject') && (
                  <button
                    onClick={() => {
                      onClose();
                      openRejectReportModal(report);
                    }}
                    className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reject Report</span>
                  </button>
                )}

                {isSettingEnabled('allow_return') && isSettingEnabled('workflow.return_for_changes') && hasPermission('reports.return') && (
                  <button
                    onClick={() => {
                      onClose();
                      openReturnReportModal(report);
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Return for Changes</span>
                  </button>
                )}

                {isMappedSigner && (hasSenderSigRequirement && !activeSenderSig ? (
                  <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1.5 text-amber-900 text-[11px] font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Sender signature required before sign-off</span>
                  </div>
                ) : (
                  isSettingEnabled('digital_signature') && isSettingEnabled('workflow.digital_signature') && hasPermission('reports.sign') && (
                    <button
                      onClick={() => {
                        onClose();
                        openSignReportModal(report);
                      }}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sign & Accept Report</span>
                    </button>
                  )
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
