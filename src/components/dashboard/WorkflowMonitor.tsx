import React, { useMemo, useRef, useState } from 'react';
import { Activity, ArrowLeft, CheckCircle2, Clock3, FileText } from 'lucide-react';
import type { ReportInstance, User, WidgetTemplate } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { activityService } from '../../features/activity/activityService';
import { templateService } from '../../features/templates/services/templateService';
import type { OrganizationActivityEvent } from '../../features/activity/activityTypes';
import type { TemplateTimelineEvent } from '../../features/templates/templateTimelineTypes';

type Tab = 'activity' | 'reports' | 'approvals';
type TraceOrigin = 'my-requests' | 'review';
type Trace = { kind: 'report' | 'template'; id: string; title: string; origin?: TraceOrigin };

interface Props {
  currentUser: User;
  reports: ReportInstance[];
  templates: WidgetTemplate[];
  pendingTemplateApprovals: WidgetTemplate[];
  myTemplateRequests: WidgetTemplate[];
  setActiveView: (view: 'organization-activity' | 'reports' | 'my-requests') => void;
  openReportViewModal: (report: ReportInstance) => void;
  openTemplateDetail: (template: WidgetTemplate) => void;
  openAddTemplateModal: (template?: WidgetTemplate | null) => void;
  openApprovalDetail: (template: WidgetTemplate) => void;
  hasPermission: (permission: any) => boolean;
}

export const WorkflowMonitor: React.FC<Props> = ({
  currentUser,
  reports,
  templates,
  pendingTemplateApprovals,
  myTemplateRequests,
  setActiveView,
  openReportViewModal,
  openTemplateDetail,
  openAddTemplateModal,
  openApprovalDetail,
  hasPermission,
}) => {
  const [tab, setTab] = useState<Tab>('reports');
  const [trace, setTrace] = useState<Trace | null>(null);
  const [activity, setActivity] = useState<OrganizationActivityEvent[]>([]);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [templateTimeline, setTemplateTimeline] = useState<TemplateTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const timelineRequest = useRef(0);

  const activeReports = useMemo(
    () => reports.filter((report) =>
      (report.status === 'Sent' || report.status === 'Returned') &&
      (report.createdById === currentUser.id || report.assignments?.some((a) => a.recipientUserId === currentUser.id))),
    [reports, currentUser.id],
  );
  const requests = useMemo(
    () => myTemplateRequests.filter((template) => template.status !== 'Archived' && template.status !== 'Superseded'),
    [myTemplateRequests],
  );
  const reviewRequests = useMemo(
    () => pendingTemplateApprovals.filter((template) =>
      template.status === 'Pending Approval' &&
      template.createdById !== currentUser.id &&
      (!template.requestedApprovalFromUserId || template.requestedApprovalFromUserId === currentUser.id)),
    [pendingTemplateApprovals, currentUser.id],
  );
  const templateById = useMemo(() => new Map(
    [...templates, ...myTemplateRequests, ...pendingTemplateApprovals].map((template) => [template.id, template]),
  ), [templates, myTemplateRequests, pendingTemplateApprovals]);
  const reportTrace = trace?.kind === 'report' ? reports.find((report) => report.id === trace.id) : null;
  const templateTrace = trace?.kind === 'template' ? templateById.get(trace.id) : null;

  const loadActivity = async () => {
    if (activityLoaded) return;
    try {
      const page = await activityService.list({ limit: 5 });
      setActivity(page.rows);
    } finally {
      setActivityLoaded(true);
    }
  };

  const openTemplateTrace = async (template: WidgetTemplate, origin: TraceOrigin) => {
    const requestId = ++timelineRequest.current;
    setTrace({ kind: 'template', id: template.id, title: template.name, origin });
    setTemplateTimeline([]);
    setTimelineError(null);
    setTimelineLoading(true);
    try {
      const events = await templateService.getTimeline(template.id);
      if (requestId === timelineRequest.current) setTemplateTimeline(events);
    } catch {
      if (requestId === timelineRequest.current) setTimelineError('Template timeline could not be loaded.');
    } finally {
      if (requestId === timelineRequest.current) setTimelineLoading(false);
    }
  };

  const switchTab = (next: Tab) => {
    setTrace(null);
    setTemplateTimeline([]);
    setTimelineError(null);
    setTab(next);
    if (next === 'activity') void loadActivity();
  };

  const reportSteps = reportTrace ? [
    ...(reportTrace.auditHistory ?? []).map((event) => ({ label: event.action, actor: event.personName, time: event.timestamp, done: true, reason: '' })),
    ...(reportTrace.status === 'Sent' ? [{ label: 'Waiting for signatures', actor: `${(reportTrace.assignments ?? []).filter((a) => a.assignmentStatus === 'pending').length} pending`, time: '', done: false, reason: '' }] : []),
  ] : [];
  const templateSteps = templateTimeline.map((event) => ({
    label: event.actionLabel,
    actor: event.actorRoleName ? `${event.actorName} (${event.actorRoleName})` : event.actorName,
    time: event.occurredAt,
    done: true,
    reason: event.reason ?? '',
  }));
  const steps = trace?.kind === 'report' ? reportSteps : templateSteps;
  const canReviewTemplate = (template: WidgetTemplate) =>
    template.status === 'Pending Approval' &&
    template.createdById !== currentUser.id &&
    (!template.requestedApprovalFromUserId || template.requestedApprovalFromUserId === currentUser.id) &&
    hasPermission('template_approvals.view');

  return <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden h-fit">
    <div className="p-4 bg-slate-50 border-b border-slate-200"><div className="flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-600" /><h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Workflow Monitor</h3></div><p className="text-[11px] text-slate-500 mt-1">Workflow Tracker</p></div>
    {!trace ? <><div role="tablist" aria-label="Workflow monitor views" className="grid grid-cols-3 gap-1 p-3 border-b border-slate-100">{(['reports', 'approvals', 'activity'] as Tab[]).map((item) => <button type="button" role="tab" aria-selected={tab === item} key={item} onClick={() => switchTab(item)} className={`rounded-lg px-2 py-2 text-[11px] font-semibold capitalize ${tab === item ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{item}</button>)}</div>
      <div className="p-4 space-y-3 min-h-[260px]">
        {tab === 'activity' && <>{!activityLoaded && <button type="button" onClick={() => void loadActivity()} className="text-xs text-indigo-600 font-semibold">Load recent activity</button>}{activity.map((event) => <div key={event.id} className="flex gap-2 text-xs"><CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" /><p className="text-slate-700"><span className="font-semibold text-slate-900">{event.actorName}</span> {event.description || event.actionLabel} <span className="font-semibold text-indigo-700">“{event.entityDisplayName}”</span><span className="block text-[10px] text-slate-400">{new Date(event.occurredAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></p></div>)}{activityLoaded && !activity.length && <p className="text-xs text-slate-500">No organization activity to show yet.</p>}<button type="button" onClick={() => setActiveView('organization-activity')} className="text-xs text-indigo-600 font-semibold">View all activity →</button></>}
        {tab === 'reports' && <>{!activeReports.length ? <p className="text-xs text-slate-500">No active reports to monitor.</p> : activeReports.map((report) => { const signed = report.assignments?.filter((a) => a.assignmentStatus === 'signed').length ?? report.signatureHistory?.filter((s) => s.isActive).length ?? 0; const total = report.assignments?.length ?? 0; return <button type="button" key={report.id} onClick={() => setTrace({ kind: 'report', id: report.id, title: report.title })} className="w-full text-left rounded-lg border border-slate-200 p-3 hover:border-indigo-300"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-slate-500"><StatusBadge status={report.status} /></span><Clock3 className="w-3.5 h-3.5 text-slate-400" /></div><div className="mt-1 text-xs font-bold text-slate-800 truncate">{report.title}</div>{report.displayId && <div className="text-[10px] font-mono text-slate-400">{report.displayId}</div>}<div className="mt-2 h-1 rounded-full bg-slate-100"><div className="h-1 rounded-full bg-indigo-500" style={{ width: `${total ? Math.min(100, signed / total * 100) : 0}%` }} /></div><div className="mt-1 text-[10px] text-slate-500">{signed} / {total} signed · View trace</div>{report.status === 'Returned' && report.createdById === currentUser.id && <span className="mt-1 block text-[10px] font-semibold text-rose-600">Action required</span>}</button>; })}</>}
        {tab === 'approvals' && <div className="space-y-4"><section><h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">My Requests</h4>{!requests.length ? <p className="text-xs text-slate-500">No template requests.</p> : requests.map((template) => <div key={template.id} className="rounded-lg border border-slate-200 p-3 hover:border-indigo-300"><button type="button" onClick={() => void openTemplateTrace(template, 'my-requests')} className="w-full text-left"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" /><span className="text-xs font-bold text-slate-800 truncate">{template.name}</span></div>{template.templateDisplayId && <div className="text-[10px] font-mono text-slate-400">{template.templateDisplayId}</div>}{!template.templateDisplayId && <div className="text-[10px] font-mono text-slate-400">Pending ID</div>}<div className="mt-1 text-[10px] font-semibold text-amber-700">{template.returnedAt ? 'Returned for Revision' : template.status}</div>{template.returnReason && <div className="mt-1 text-[10px] text-slate-500 line-clamp-2">{template.returnReason}</div>}</button>{template.returnedAt && hasPermission('templates.edit_own_draft') && <button type="button" onClick={() => openAddTemplateModal(template)} className="mt-2 text-[10px] font-semibold text-indigo-600">Edit template</button>}</div>)}</section><section><h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Needs My Review</h4>{!reviewRequests.length ? <p className="text-xs text-slate-500">No templates awaiting your review.</p> : reviewRequests.map((template) => <div key={template.id} className="mb-2 rounded-lg border border-slate-200 p-3 hover:border-indigo-300"><button type="button" onClick={() => void openTemplateTrace(template, 'review')} className="w-full text-left"><span className="flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" /><span className="text-xs font-bold text-slate-800 truncate">{template.name}</span></span>{template.templateDisplayId && <span className="mt-1 block text-[10px] font-mono text-slate-400">{template.templateDisplayId}</span>}<span className="mt-1 block text-[10px] font-semibold text-amber-700">Awaiting Review</span></button></div>)}</section></div>}
      </div></> : <div className="p-4 min-h-[260px]"><button type="button" onClick={() => { setTrace(null); setTemplateTimeline([]); }} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"><ArrowLeft className="w-3.5 h-3.5" />{trace.origin === 'review' ? 'Needs My Review' : trace.origin === 'my-requests' ? 'My Requests' : 'Active Reports'}</button><h4 className="text-sm font-bold text-slate-900">{trace.title}</h4>{trace.kind === 'template' && <p className="text-[10px] font-mono text-slate-400">{templateTrace?.templateDisplayId ?? 'Pending ID'}</p>}{trace.kind === 'report' && reportTrace?.displayId && <p className="text-[10px] font-mono text-slate-400">{reportTrace.displayId}</p>}{trace.kind === 'template' && timelineLoading && <p className="mt-4 text-xs text-slate-500">Loading template timeline…</p>}{timelineError && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{timelineError}</p>}{trace.kind === 'template' && !timelineLoading && !timelineError && !steps.length && <p className="mt-4 text-xs text-slate-500">No audit events are available for this template.</p>}{steps.length > 0 && <div className="mt-4 ml-2 border-l-2 border-slate-200 pl-4 space-y-4">{steps.map((step, index) => <div key={`${step.label}-${index}`} className="relative"><span className={`absolute -left-[23px] top-0.5 h-3 w-3 rounded-full border-2 ${step.done ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white'}`} /><p className="text-xs font-semibold text-slate-800">{step.label}</p>{step.actor && <p className="text-[10px] text-slate-500">{step.actor}</p>}{step.reason && <p className="text-[10px] text-slate-600">Reason: {step.reason}</p>}{step.time && <p className="text-[10px] text-slate-400">{new Date(step.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>}</div>)}</div>}{trace.kind === 'report' && reportTrace && <button type="button" onClick={() => openReportViewModal(reportTrace)} className="mt-5 text-xs font-semibold text-indigo-600">Open report details →</button>}{trace.kind === 'template' && templateTrace && trace.origin === 'review' && canReviewTemplate(templateTrace) && <button type="button" onClick={() => openApprovalDetail(templateTrace)} className="mt-5 text-xs font-semibold text-indigo-600">Review template →</button>}{trace.kind === 'template' && templateTrace && trace.origin === 'my-requests' && templateTrace.returnedAt && hasPermission('templates.edit_own_draft') && <button type="button" onClick={() => openAddTemplateModal(templateTrace)} className="mt-5 text-xs font-semibold text-indigo-600">Edit template →</button>}{trace.kind === 'template' && templateTrace && templateTrace.status === 'Approved' && <button type="button" onClick={() => openTemplateDetail(templateTrace)} className="mt-5 ml-3 text-xs font-semibold text-indigo-600">Open template →</button>}</div>}
  </div>;
};
