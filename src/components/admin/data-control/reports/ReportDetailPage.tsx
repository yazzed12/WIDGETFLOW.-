import React, { useState } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileCode2,
  Calendar,
  User,
  Check,
} from 'lucide-react';
import type { ReportInstance, WidgetTemplate } from '../../../../types';
import { StatusPill } from '../common/StatusPill';
import { formatDate, resolveTemplateName, resolveUserName } from '../common/entityResolvers';
import { AdvancedRecordDetails } from '../common/AdvancedRecordDetails';
import { DynamicTemplateRenderer } from '../../../dynamic-template/DynamicTemplateRenderer';
import {
  normalizeReportTemplateSnapshot,
  normalizeReportDataForEditing,
  getReportBusinessFieldKey,
} from '../../../../shared/signatureResolver';
import { useApp } from '../../../../context/AppContext';

type ReportTab = 'data' | 'overview' | 'recipients' | 'signatures' | 'history';

interface ReportDetailPageProps {
  report: ReportInstance;
  templates?: WidgetTemplate[];
  onBack: () => void;
  onNavigateToTemplate: (templateId: string) => void;
  onNavigateToUser?: (userId: string) => void;
}

export const ReportDetailPage: React.FC<ReportDetailPageProps> = ({
  report,
  templates = [],
  onBack,
  onNavigateToTemplate,
  onNavigateToUser,
}) => {
  const { users = [] } = useApp();
  const [activeTab, setActiveTab] = useState<ReportTab>('data');

  // Resolve template canonical snapshot or matching template
  const rawTemplate = (report as any).templateSnapshot
    ? (report as any).templateSnapshot
    : templates.find((t) => t.id === report.templateId);

  const normalizedTemplate = rawTemplate
    ? normalizeReportTemplateSnapshot(rawTemplate)
    : undefined;

  const normalizedValues = normalizeReportDataForEditing(
    report.values || report.data || {},
    normalizedTemplate
  );

  const creatorName = resolveUserName(report.createdById, report.createdByName, users);
  const templateName = resolveTemplateName(report.templateId, report.templateName, templates);

  // Field definitions for human-readable labels in table
  const templateComponents: any[] = [];
  if (normalizedTemplate?.components) templateComponents.push(...normalizedTemplate.components);
  if (normalizedTemplate?.fields) templateComponents.push(...normalizedTemplate.fields);

  const getFieldLabel = (key: string) => {
    const match = templateComponents.find(
      (c) => getReportBusinessFieldKey(c) === key || c.key === key || c.field_key === key || c.id === key
    );
    return match?.label || match?.title || key.replace(/_/g, ' ');
  };

  const recipientCount = report.assignments?.length || (report.sentToName ? 1 : 0);

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
          <span>Back to Reports</span>
        </button>
      </div>

      {/* Header card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {report.title || 'Untitled Report'}
                </h1>
                <StatusPill status={report.status} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Created by{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (report.createdById && onNavigateToUser) {
                        onNavigateToUser(report.createdById);
                      }
                    }}
                    className="text-slate-800 font-bold hover:text-purple-700 hover:underline cursor-pointer"
                  >
                    {creatorName}
                  </button>
                </span>
                <span className="flex items-center gap-1">
                  <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                  Template:{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (report.templateId && onNavigateToTemplate) {
                        onNavigateToTemplate(report.templateId);
                      }
                    }}
                    className="text-purple-700 font-bold hover:underline cursor-pointer"
                  >
                    {templateName}
                  </button>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Created {formatDate(report.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'data', label: 'Report Content & Form Data' },
            { id: 'overview', label: 'Overview' },
            { id: 'recipients', label: `Recipients (${recipientCount})` },
            { id: 'signatures', label: `Signatures (${report.activeSignatures?.length || (report.signature ? 1 : 0)})` },
            { id: 'history', label: 'Lifecycle Audit History' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ReportTab)}
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

      {/* TAB: REPORT DATA */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* Canonical DynamicTemplateRenderer in read-only mode */}
          {normalizedTemplate ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Rendered Report Form
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Original template layout populated with verified submission values.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                  Verified Data
                </span>
              </div>

              <div className="py-4 border border-slate-100 rounded-2xl bg-slate-50/50 p-4 md:p-6">
                <DynamicTemplateRenderer
                  template={normalizedTemplate}
                  values={normalizedValues}
                  mode="readOnly"
                  reportId={report.id}
                  activeSignatures={report.activeSignatures}
                  signatureHistory={report.signatureHistory}
                  signatureAssignments={report.signatureAssignments}
                  assignments={report.assignments}
                />
              </div>
            </div>
          ) : null}

          {/* Human-readable Submitted Field Values Table */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Submitted Field Values Summary
            </h3>
            {Object.keys(normalizedValues).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No field values recorded in this report.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-3">Field Label</th>
                      <th className="py-2.5 px-3">Submitted Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(normalizedValues).map(([key, val]) => (
                      <tr key={key} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {getFieldLabel(key)}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-pre-wrap">
                          {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Report Lifecycle Specifications
              </h3>
              <dl className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Author</dt>
                  <dd className="font-bold text-slate-900">{creatorName}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Template Reference</dt>
                  <dd className="font-bold text-purple-700">{templateName}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Lifecycle Status</dt>
                  <dd className="font-bold text-slate-900">{report.status}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500 font-medium">Created Timestamp</dt>
                  <dd className="text-slate-700 font-medium">{formatDate(report.createdAt, true)}</dd>
                </div>
                {report.sentAt && (
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-slate-500 font-medium">Sent Timestamp</dt>
                    <dd className="text-slate-700 font-medium">{formatDate(report.sentAt, true)}</dd>
                  </div>
                )}
                {report.lockedAt && (
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-slate-500 font-medium">Locked Timestamp</dt>
                    <dd className="text-slate-700 font-medium">{formatDate(report.lockedAt, true)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Distribution &amp; Sender Note
              </h3>
              {report.senderNote ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed italic">
                  "{report.senderNote}"
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No sender note attached to this report.</p>
              )}
            </div>
          </div>

          <AdvancedRecordDetails recordId={report.id} data={report as unknown as Record<string, unknown>} />
        </div>
      )}

      {/* TAB: RECIPIENTS */}
      {activeTab === 'recipients' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recipients &amp; Delivery Tracking
          </h3>

          {report.assignments && report.assignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Assigned Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.assignments.map((asg: any) => (
                    <tr key={asg.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {asg.recipientName || 'Recipient'}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusPill status={asg.assignmentStatus} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {formatDate(asg.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : report.sentToName ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800">{report.sentToName}</span>
                <span className="text-slate-400 ml-2">Direct Recipient</span>
              </div>
              <StatusPill status={report.status} size="sm" />
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No individual recipient assigned.</p>
          )}
        </div>
      )}

      {/* TAB: SIGNATURES */}
      {activeTab === 'signatures' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Digital Signatures &amp; Attestations
          </h3>

          {report.activeSignatures && report.activeSignatures.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {report.activeSignatures.map((sig: any, idx: number) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {sig.signedByName || sig.signerName || 'Signer'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Role: {sig.signedByRole || sig.signatureRole || 'Signer'} · {formatDate(sig.signedAt || sig.timestamp, true)}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    ID: {sig.verificationId || 'Verified'}
                  </span>
                </div>
              ))}
            </div>
          ) : report.signature ? (
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs flex items-center justify-between">
              <div>
                <p className="font-bold text-emerald-900">{report.signature.signedByName}</p>
                <p className="text-[11px] text-emerald-700">
                  Signed {formatDate(report.signature.signedAt, true)}
                </p>
              </div>
              <span className="font-mono text-[10px] text-emerald-800">
                Verification: {report.signature.verificationId}
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No digital signatures logged for this report.</p>
          )}
        </div>
      )}

      {/* TAB: HISTORY */}
      {activeTab === 'history' && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Report Lifecycle Audit Timeline
          </h3>

          {report.auditHistory && report.auditHistory.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
              {report.auditHistory.map((rec: any, idx: number) => (
                <div key={rec.id || idx} className="relative">
                  <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-purple-600 ring-4 ring-white" />
                  <p className="font-bold text-slate-900">
                    {rec.personName} <span className="text-slate-400 font-normal">({rec.role})</span>
                  </p>
                  <p className="text-purple-700 font-semibold text-[11px]">{rec.action}</p>
                  {rec.comment && (
                    <p className="text-slate-600 italic text-[11px] mt-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      "{rec.comment}"
                    </p>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    {formatDate(rec.timestamp, true)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No audit records recorded for this report.</p>
          )}
        </div>
      )}
    </div>
  );
};
