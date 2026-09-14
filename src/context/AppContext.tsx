import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type {
  User,
  Category,
  WidgetTemplate,
  ApprovalRecord,
  Notification,
  ReportInstance,
  ReportComment,
  ViewType,
  WidgetLayoutType,
  RequestComment,
} from '../types';
import { apiService } from '../services/apiService';
import type { PermissionKey } from '../shared/permissionCatalog';
import { hasPermissionKeys } from '../shared/permissionCatalog';
import { templateService } from '../features/templates/services/templateService';
import { reportService } from '../features/reports/reportService';
import { ReportPersistenceCoordinator } from '../features/reports/reportPersistenceCoordinator';
import { normalizeError } from '../lib/errors/errorHandling';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface AppContextType {
  currentUser: User;
  users: User[];
  templates: WidgetTemplate[];
  categories: Category[];
  approvalRecords: ApprovalRecord[];
  requestComments: RequestComment[];
  reportComments: ReportComment[];
  notifications: Notification[];
  reports: ReportInstance[];
  activeView: ViewType;
  selectedCategory: string | null;
  searchTerm: string;
  sidebarOpen: boolean;
  toast: ToastState | null;
  templatesLoading: boolean;
  templatesError: string | null;
  categoriesLoading: boolean;

  // Modal & Drawer states
  isAddModalOpen: boolean;
  isChatDrawerOpen: boolean;
  isProfileModalOpen: boolean;
  draftToEdit: WidgetTemplate | null;
  selectedTemplateForDetail: WidgetTemplate | null;
  selectedRequestForDrawer: WidgetTemplate | null;
  selectedApprovalForDrawer: WidgetTemplate | null;
  selectedTemplateForFill: WidgetTemplate | null;
  selectedReportForView: ReportInstance | null;
  selectedReportForSend: ReportInstance | null;
  selectedReportForReturn: ReportInstance | null;
  selectedReportForReject: ReportInstance | null;
  selectedReportForSign: ReportInstance | null;
  reportToEdit: ReportInstance | null;

  // Navigation & UI Actions
  setActiveView: (view: ViewType) => void;
  setSelectedCategory: (catId: string | null) => void;
  setSearchTerm: (term: string) => void;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;

  // Modal & Drawer Triggers
  openAddTemplateModal: (draft?: WidgetTemplate | null) => void;
  closeAddTemplateModal: () => void;
  openTemplateDetail: (template: WidgetTemplate) => void;
  closeTemplateDetail: () => void;
  openRequestDetail: (template: WidgetTemplate) => void;
  closeRequestDetail: () => void;
  openApprovalDetail: (template: WidgetTemplate) => void;
  closeApprovalDetail: () => void;
  openFillReportModal: (template: WidgetTemplate, reportToEdit?: ReportInstance | null) => void;
  closeFillReportModal: () => void;
  openReportViewModal: (report: ReportInstance) => void;
  closeReportViewModal: () => void;

  openSendReportModal: (report: ReportInstance) => void;
  closeSendReportModal: () => void;
  openReturnReportModal: (report: ReportInstance) => void;
  closeReturnReportModal: () => void;
  openRejectReportModal: (report: ReportInstance) => void;
  closeRejectReportModal: () => void;
  openSignReportModal: (report: ReportInstance) => void;
  closeSignReportModal: () => void;

  openProfileModal: () => void;
  closeProfileModal: () => void;

  toggleChatDrawer: (open?: boolean) => void;

  // Template Handlers
  saveTemplateDraft: (data: {
    name: string;
    categoryId: string;
    description: string;
    tags: string[];
    layoutType?: WidgetLayoutType;
  }, existingId?: string) => void;

  submitTemplateForApproval: (data: {
    name: string;
    categoryId: string;
    description: string;
    tags: string[];
    layoutType?: WidgetLayoutType;
  }, existingId?: string) => void;

  approveTemplate: (templateId: string) => void;
  rejectTemplate: (templateId: string, reason: string) => void;
  returnTemplateForRevision: (templateId: string, reason: string) => void;
  addRequestComment: (templateId: string, message: string) => void;

  // Report Instance Handlers
  createReportInstance: (
    payload: string | { templateId: string; data?: Record<string, any>; title?: string }
  ) => Promise<ReportInstance | undefined>;

  ensureReportInstance: (
    payload: { templateId: string; data?: Record<string, any>; title?: string }
  ) => Promise<ReportInstance>;

  updateReportInstance: (
    reportId: string,
    data: Record<string, string | number>,
    title?: string,
    markAsCompleted?: boolean
  ) => Promise<ReportInstance | undefined>;

  markReportCompleted: (reportId: string) => void;
  sendReport: (reportId: string, recipientId: string | string[], senderNote?: string, signaturePayload?: any) => Promise<void>;
  returnReport: (reportId: string, feedback: string) => void;
  rejectReport: (reportId: string, reason: string) => Promise<void>;
  signReport: (reportId: string, payload?: any) => Promise<void>;
  addReportComment: (reportId: string, message: string) => void;

  claimTemplateReview: (templateId: string) => Promise<WidgetTemplate | undefined>;
  refreshTemplates: () => Promise<void>;
  clearTemplatesError: () => void;
  refreshReports: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  // Derived helpers
  getCategoryTemplateCount: (catId: string) => number;
  getTotalCategoryCount: () => number;
  getApprovedTemplateCategoryCount: () => number;
  getApprovedTemplates: () => WidgetTemplate[];
  getPendingApprovalsForUser: () => WidgetTemplate[];
  getMyRequestsForUser: () => WidgetTemplate[];
  getReportsAwaitingMyReview: () => ReportInstance[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const isSupabasePrincipal = (user: User) =>
  /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(user.id);

export const AppProvider: React.FC<{
  children: ReactNode;
  authenticatedPrincipal: User;
}> = ({ children, authenticatedPrincipal }) => {
  const currentUser = authenticatedPrincipal;
  const [users] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [myTemplates, setMyTemplates] = useState<WidgetTemplate[]>([]);
  const [pendingTemplateApprovals, setPendingTemplateApprovals] = useState<WidgetTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [approvalRecords] = useState<ApprovalRecord[]>([]);
  const [requestComments] = useState<RequestComment[]>([]);
  const [reportComments] = useState<ReportComment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<ReportInstance[]>([]);

  const refreshCategories = async () => {
    setCategoriesLoading(true);
    try {
      const data = await templateService.getCategories();
      setCategories(data);
    }
    catch (error: any) { console.warn('Failed to load Supabase categories:', error?.message ?? error); }
    finally { setCategoriesLoading(false); }
  };
  useEffect(() => { void refreshTemplates(); void refreshCategories(); }, []);

  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Modal / Drawer Control States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [draftToEdit, setDraftToEdit] = useState<WidgetTemplate | null>(null);
  const [selectedTemplateForDetail, setSelectedTemplateForDetail] = useState<WidgetTemplate | null>(null);
  const [selectedRequestForDrawer, setSelectedRequestForDrawer] = useState<WidgetTemplate | null>(null);
  const [selectedApprovalForDrawer, setSelectedApprovalForDrawer] = useState<WidgetTemplate | null>(null);
  const [selectedTemplateForFill, setSelectedTemplateForFill] = useState<WidgetTemplate | null>(null);
  const [selectedReportForView, setSelectedReportForView] = useState<ReportInstance | null>(null);
  const [selectedReportForSend, setSelectedReportForSend] = useState<ReportInstance | null>(null);
  const [selectedReportForReturn, setSelectedReportForReturn] = useState<ReportInstance | null>(null);
  const [selectedReportForReject, setSelectedReportForReject] = useState<ReportInstance | null>(null);
  const [selectedReportForSign, setSelectedReportForSign] = useState<ReportInstance | null>(null);
  const [reportToEdit, setReportToEdit] = useState<ReportInstance | null>(null);
  const reportPersistenceRef = useRef(
    new ReportPersistenceCoordinator<ReportInstance>((payload) =>
      reportService.create(payload.templateId, payload.data, payload.title),
    ),
  );

  const markNotificationRead = async (id: string) => {
    if (isSupabasePrincipal(currentUser)) {
      try {
        const updatedNotifs = await reportService.markNotificationRead(id, currentUser.id);
        setNotifications(updatedNotifs);
      } catch {
        showToast('Unable to mark notification as read.', 'warning');
      }
      return;
    }
    try {
      const updatedNotifs = await apiService.markNotificationRead(id);
      setNotifications(updatedNotifs);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const markAllNotificationsRead = async () => {
    if (isSupabasePrincipal(currentUser)) {
      try {
        const updatedNotifs = await reportService.markAllNotificationsRead(currentUser.id);
        setNotifications(updatedNotifs);
        showToast('All notifications marked as read', 'success');
      } catch {
        showToast('Unable to mark notifications as read.', 'warning');
      }
      return;
    }
    try {
      const updatedNotifs = await apiService.markAllNotificationsRead();
      setNotifications(updatedNotifs);
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.userId === currentUser.id ? { ...n, read: true } : n))
      );
    }
    showToast('All notifications marked as read', 'success');
  };

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const newToast = { id: Date.now(), message, type };
    setToast(newToast);
    setTimeout(() => {
      setToast((current) => (current?.id === newToast.id ? null : current));
    }, 4000);
  };

  // Modal / Drawer Handlers
  const openAddTemplateModal = (draft?: WidgetTemplate | null) => {
    setDraftToEdit(draft || null);
    setIsAddModalOpen(true);
  };

  const closeAddTemplateModal = () => {
    setIsAddModalOpen(false);
    setDraftToEdit(null);
  };

  const openTemplateDetail = (template: WidgetTemplate) => {
    setSelectedTemplateForDetail(template);
  };

  const closeTemplateDetail = () => {
    setSelectedTemplateForDetail(null);
  };

  const openRequestDetail = (template: WidgetTemplate) => {
    setSelectedRequestForDrawer(template);
  };

  const closeRequestDetail = () => {
    setSelectedRequestForDrawer(null);
  };

  const openApprovalDetail = (template: WidgetTemplate) => {
    setSelectedApprovalForDrawer(template);
  };

  const closeApprovalDetail = () => {
    setSelectedApprovalForDrawer(null);
  };

  const openFillReportModal = (template: WidgetTemplate, reportInstanceToEdit?: ReportInstance | null) => {
    reportPersistenceRef.current.seed(reportInstanceToEdit || null);
    setSelectedTemplateForFill(template);
    setReportToEdit(reportInstanceToEdit || null);
  };

  const closeFillReportModal = () => {
    reportPersistenceRef.current.clear();
    setSelectedTemplateForFill(null);
    setReportToEdit(null);
  };

  const openReportViewModal = (report: ReportInstance) => {
    setSelectedReportForView(report);
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(report.id)) {
      void reportService.get(report.id).then((detail) => setSelectedReportForView(detail)).catch((err) => console.warn('Failed to hydrate report detail:', err?.message ?? err));
    }
  };

  const closeReportViewModal = () => {
    setSelectedReportForView(null);
  };

  const openSendReportModal = (report: ReportInstance) => {
    // UUID reports must use the immutable template-version snapshot. Create/complete
    // RPC responses are intentionally lightweight, so hydrate the authoritative
    // detail before mounting the send modal.
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(report.id)) {
      setSelectedReportForSend(null);
      void reportService.get(report.id)
        .then((detail) => setSelectedReportForSend(detail))
        .catch((err) => {
          setSelectedReportForSend(null);
          showToast(err?.message || 'Unable to load the historical report version before sending.', 'warning');
        });
      return;
    }
    setSelectedReportForSend(report);
  };

  const closeSendReportModal = () => {
    setSelectedReportForSend(null);
  };

  const openReturnReportModal = (report: ReportInstance) => {
    setSelectedReportForReturn(report);
  };

  const closeReturnReportModal = () => {
    setSelectedReportForReturn(null);
  };

  const openRejectReportModal = (report: ReportInstance) => {
    setSelectedReportForReject(report);
  };

  const closeRejectReportModal = () => {
    setSelectedReportForReject(null);
  };

  const openSignReportModal = (report: ReportInstance) => {
    setSelectedReportForSign(report);
  };

  const closeSignReportModal = () => {
    setSelectedReportForSign(null);
  };

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const toggleChatDrawer = (open?: boolean) => {
    setIsChatDrawerOpen((prev) => (open !== undefined ? open : !prev));
  };

  // Centralized API Refresh Functions
  const refreshTemplates = async () => {
    setTemplatesLoading(true); setTemplatesError(null);
    try {
      if (isSupabasePrincipal(currentUser)) {
        const [approved, owned, pending] = await Promise.all([
          templateService.getTemplates(),
          templateService.getMyTemplates(),
          templateService.getPendingApprovals(),
        ]);
        setTemplates(approved);
        // Older deployed draft-save responses may omit the return marker even
        // though the template is still the creator's returned-for-revision
        // draft. Preserve that UI context until the next successful resubmit
        // changes the canonical status to pending approval.
        setMyTemplates((previous) => owned.map((template) => {
          const prior = previous.find((candidate) => candidate.id === template.id);
          if (
            template.status === 'Draft' &&
            prior?.status === 'Draft' &&
            prior.returnedAt &&
            !template.returnedAt
          ) {
            return { ...template, returnedAt: prior.returnedAt, returnReason: prior.returnReason };
          }
          return template;
        }));
        setPendingTemplateApprovals(pending);
      } else {
        const data = await templateService.getTemplates();
        setTemplates(data);
        setMyTemplates(data.filter((template) => template.createdById === currentUser.id));
        setPendingTemplateApprovals([]);
      }
    } catch (err: any) {
      setTemplatesError(err.message || 'Unable to load report templates.');
      console.warn('Failed to refresh templates:', err.message);
    } finally { setTemplatesLoading(false); }
  };
  // Approval Inbox and My Requests are long-lived views. Refresh their
  // Supabase-backed collections when entered so an already-open session sees
  // newly submitted or updated templates without requiring a full reload.
  useEffect(() => {
    if (activeView === 'approvals' || activeView === 'my-requests') {
      void refreshTemplates();
    }
  }, [activeView]);
  const clearTemplatesError = () => setTemplatesError(null);

  const refreshReports = async () => {
    try {
      const data = await reportService.list();
      setReports(data);
    } catch (err: any) {
      console.warn('Failed to refresh reports:', err.message);
    }
  };
  useEffect(() => { void refreshReports(); }, []);

  const refreshNotifications = async () => {
    try {
      if (isSupabasePrincipal(currentUser)) {
        setNotifications(await reportService.listNotifications(currentUser.id));
      } else {
        setNotifications(await apiService.getNotifications());
      }
    } catch (err: any) {
      console.warn('Failed to refresh notifications:', err.message);
    }
  };
  useEffect(() => { void refreshNotifications(); }, [currentUser.id]);

  // Save Draft Action for Report Template
  const saveTemplateDraft = async (
    data: {
      name: string;
      categoryId: string;
      description: string;
      tags: string[];
      layoutType?: WidgetLayoutType;
    },
    existingId?: string
  ) => {
    try {
      const draft = { ...data, id: existingId, status: 'Draft', createdById: currentUser.id, createdByName: currentUser.name, createdByRole: currentUser.role, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: data.tags ?? [] } as WidgetTemplate;
      await templateService.saveDraft(draft);
      await refreshTemplates();
      showToast('Report template saved as draft', 'info');
      closeAddTemplateModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to save template draft', 'warning');
    }
  };

  // Submit Template for Approval Action
  const submitTemplateForApproval = async (
    data: {
      name: string;
      categoryId: string;
      description: string;
      tags: string[];
      layoutType?: WidgetLayoutType;
    },
    existingId?: string
  ) => {
    try {
      // 1. Create or update template draft first
      const draft = { ...data, id: existingId, status: 'Draft', createdById: currentUser.id, createdByName: currentUser.name, createdByRole: currentUser.role, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: data.tags ?? [] } as WidgetTemplate;
      const savedTemplate = await templateService.saveDraft(draft);
      if (!savedTemplate || !savedTemplate.id) {
        throw new Error('Failed to create template draft prior to submission.');
      }

      // 2. Submit specific template by ID
      const result = await templateService.submit(savedTemplate.id);
      await refreshTemplates();
      if ((result as any).status === 'approved' || (result as any).status === 'Approved') {
        showToast('Report template published directly to firm library!', 'success');
      } else {
        showToast(`Template request submitted to ${result.requestedApprovalFromName || 'approver'}`, 'success');
      }
      closeAddTemplateModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit template for approval', 'warning');
    }
  };

  // Approve Template Action
  const approveTemplate = async (templateId: string) => {
    try {
      const tpl = await templateService.approve(templateId) as any;
      await refreshTemplates();
      showToast(`Approved "${tpl.name}". Now published firm-wide.`, 'success');
      closeApprovalDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve template', 'warning');
    }
  };

  // Reject Template Action
  const rejectTemplate = async (templateId: string, reason: string) => {
    try {
      const tpl = await templateService.reject(templateId, reason) as any;
      await refreshTemplates();
      showToast(`Rejected "${tpl.name}". Feedback sent to author.`, 'info');
      closeApprovalDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject template', 'warning');
    }
  };

  // Return a pending template to its creator as an editable draft. The
  // reviewer action is distinct from permanent rejection and uses the
  // canonical Supabase reviewer authorization in the RPC.
  const returnTemplateForRevision = async (templateId: string, reason: string) => {
    try {
      const tpl = await templateService.returnForRevision(templateId, reason) as any;
      await refreshTemplates();
      showToast(`Template "${tpl.name}" returned for revision.`, 'info');
      closeApprovalDetail();
    } catch (err: any) {
      showToast(normalizeError(err).message, 'warning');
    }
  };

  // Claim Template Review Action
  const claimTemplateReview = async (templateId: string) => {
    try {
      const tpl = await templateService.claimReview(templateId) as any;
      await refreshTemplates();
      showToast(`Claimed review for "${tpl.name}".`, 'success');
      return tpl;
    } catch (err: any) {
      showToast(err.message || 'Failed to claim template review', 'warning');
      throw err;
    }
  };

  // Add Template Comment Action
  const addRequestComment = async (templateId: string, message: string) => {
    try {
      await templateService.addComment(templateId, message);
      await refreshTemplates();
      showToast('Comment posted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment', 'warning');
    }
  };

  // Create Report Instance from Approved Template
  const ensureReportInstance = async (
    payload: { templateId: string; data?: Record<string, any>; title?: string }
  ): Promise<ReportInstance> => {
    if (reportToEdit && !reportPersistenceRef.current.getCurrent()) {
      reportPersistenceRef.current.seed(reportToEdit);
    }

    const before = reportPersistenceRef.current.getCurrent();
    const report = await reportPersistenceRef.current.ensure(payload);

    if (!before && reportPersistenceRef.current.getCurrent() === report) {
      setReportToEdit(report);
      await refreshReports();
    }

    return report;
  };

  const createReportInstance = async (
    payload: string | { templateId: string; data?: Record<string, any>; title?: string }
  ): Promise<ReportInstance | undefined> => {
    const tplId = typeof payload === 'string' ? payload : payload.templateId;
    const initialData = typeof payload === 'object' ? payload.data : undefined;
    const initialTitle = typeof payload === 'object' ? payload.title : undefined;

    try {
      const newReport = await reportService.create(tplId, initialData, initialTitle);
      const stagedAssetIds = Object.values(initialData ?? {}).map((value: any) => value && typeof value === 'object' ? value.attachmentId : null).filter((id): id is string => typeof id === 'string');
      for (const assetId of stagedAssetIds) await apiService.linkReportAsset(assetId, newReport.id);
      await refreshReports();
      showToast(`Created report instance "${newReport.title}"`, 'success');
      return newReport;
    } catch (err: any) {
      showToast(err.message || 'Failed to create report instance', 'warning');
      throw err;
    }
  };

  // Update Report Instance
  const updateReportInstance = async (
    reportId: string,
    data: Record<string, string | number>,
    title?: string,
    markAsCompleted?: boolean
  ): Promise<ReportInstance | undefined> => {
    try {
      if (markAsCompleted) {
        const completed = await reportService.complete(reportId, data, title);
        showToast('Report completed and marked ready for review', 'success');
        await refreshReports(); closeFillReportModal(); return completed;
      } else {
        const saved = await reportService.saveDraft(reportId, data, title || 'Report');
        showToast('Report draft updates saved', 'info');
        await refreshReports(); closeFillReportModal(); return saved;
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update report', 'warning');
      throw err;
    }
  };

  // Mark Report Completed
  const markReportCompleted = async (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;
    try {
      await reportService.complete(reportId, report.data, report.title);
      await refreshReports();
      showToast('Report marked completed and ready to send', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to complete report', 'warning');
    }
  };

  // Send Report Action
  const sendReport = async (reportId: string, recipientUserId: string | string[], senderNote?: string, signaturePayload?: any) => {
    try {
      if (!import.meta.env.DEV || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(reportId)) {
        const mappings = Array.isArray(signaturePayload) ? signaturePayload : [];
        await reportService.send(reportId, Array.isArray(recipientUserId) ? recipientUserId : [recipientUserId], senderNote, mappings);
        await refreshReports();
        showToast('Report sent successfully.', 'success');
        closeSendReportModal();
        return;
      }
      const updated = await apiService.sendReport(reportId, Array.isArray(recipientUserId) ? recipientUserId[0] : recipientUserId, senderNote, signaturePayload);
      await Promise.all([refreshReports(), refreshNotifications()]);
      showToast(`Report sent to ${updated.sentToName} for review & signature`, 'success');
      closeSendReportModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to send report', 'warning');
      throw err;
    }
  };

  // Return Report Action
  const returnReport = async (reportId: string, feedback: string) => {
    try {
      if (!import.meta.env.DEV || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(reportId)) {
        const report = reports.find((r) => r.id === reportId);
        // Bind the action to the assignment in the report's active send cycle.
        // A recipient may have historical assignments from prior cycles; using
        // the first matching user can submit a stale assignment id.
        const assignment = report?.assignments?.find((a) =>
          a.recipientUserId === currentUser.id
          && (!report.currentSendCycleId || a.sendCycleId === report.currentSendCycleId)
          && a.assignmentStatus === 'pending'
        );
        if (!assignment) throw new Error('ASSIGNMENT_NOT_OWNED');
        await reportService.returnReport(reportId, assignment.id, feedback);
        await Promise.all([refreshReports(), refreshNotifications()]);
        showToast('Report returned to author for changes', 'info');
        closeReturnReportModal();
        return;
      }
      await apiService.returnReport(reportId, feedback);
      await Promise.all([refreshReports(), refreshNotifications()]);
      showToast('Report returned to author for changes', 'info');
      closeReturnReportModal();
    } catch (err: any) {
      showToast(normalizeError(err).message, 'warning');
    }
  };

  // Reject Report Action
  const rejectReport = async (reportId: string, reason: string) => {
    try {
      if (!import.meta.env.DEV || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(reportId)) {
        const report = reports.find((r) => r.id === reportId);
        const assignment = report?.assignments?.find((a) => a.recipientUserId === currentUser.id && (!report.currentSendCycleId || a.sendCycleId === report.currentSendCycleId) && a.assignmentStatus === 'pending');
        if (!assignment) throw new Error('ASSIGNMENT_NOT_OWNED');
        await reportService.rejectReport(reportId, assignment.id, reason);
        await Promise.all([refreshReports(), refreshNotifications()]);
        showToast('Report rejected', 'info');
        closeRejectReportModal();
        return;
      }
      await apiService.rejectReport(reportId, reason);
      await Promise.all([refreshReports(), refreshNotifications()]);
      showToast('Report rejected', 'info');
      closeRejectReportModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject report', 'warning');
      throw err;
    }
  };

  // Sign Report Action
  const signReport = async (reportId: string, payload: any = {}) => {
    try {
      if (!import.meta.env.DEV || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(reportId)) {
        const report = reports.find((r) => r.id === reportId);
        const assignment = report?.assignments?.find((a) => a.recipientUserId === currentUser.id);
        if (!assignment) throw new Error('ASSIGNMENT_NOT_OWNED');
        await reportService.signReport(reportId, assignment.id, payload);
        // RPC responses are intentionally partial; hydrate from the authoritative detail query.
        try {
          const detail = await reportService.get(reportId);
          setReports((previous) => previous.map((item) => item.id === reportId ? detail : item));
        } catch (refreshError: any) {
          console.warn('Signature succeeded but report detail refresh failed:', refreshError?.message ?? refreshError);
        }
        await Promise.all([refreshReports(), refreshNotifications()]);
        showToast('Report signed successfully', 'success');
        closeSignReportModal();
        return;
      }
      const updated = await apiService.signReport(reportId, payload);
      await Promise.all([refreshReports(), refreshNotifications()]);
      const verId = updated.signature?.verificationId || updated.activeSignatures?.[updated.activeSignatures.length - 1]?.verificationId || 'SIG-VERIFIED';
      showToast(`Report signed successfully (${verId})`, 'success');
      closeSignReportModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to sign report', 'warning');
      throw err;
    }
  };

  // Add Report Comment Action
  const addReportComment = async (reportId: string, message: string) => {
    try {
      if (!import.meta.env.DEV || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(reportId)) await reportService.addReportComment(reportId, message);
      else await apiService.addReportComment(reportId, message);
      await Promise.all([refreshReports(), refreshNotifications()]);
      showToast('Comment posted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment', 'warning');
    }
  };

  // Derived helpers
  const getApprovedTemplates = () => {
    return templates.filter((t) => t.status === 'Approved');
  };

  const getCategoryTemplateCount = (catId: string) => {
    return templates.filter((t) => t.categoryId === catId && t.status === 'Approved').length;
  };
  const getTotalCategoryCount = () => categories.length;
  const getApprovedTemplateCategoryCount = () => new Set(
    getApprovedTemplates().map((template) => template.categoryId).filter(Boolean)
  ).size;

  const getPendingApprovalsForUser = () => {
    return pendingTemplateApprovals.filter((template) => template.createdById !== currentUser.id);
  };

  const getMyRequestsForUser = () => {
    return myTemplates.filter((t) => t.createdById === currentUser.id);
  };

  const getReportsAwaitingMyReview = () => {
    return reports.filter(
      (r) => r.status === 'Sent' && (r.assignments?.some((a) => a.recipientUserId === currentUser.id) || r.sentToId === currentUser.id)
    );
  };

  const hasPermission = (permission: PermissionKey) => hasPermissionKeys(currentUser.permissions, permission);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        templates,
        categories,
        approvalRecords,
        requestComments,
        reportComments,
        notifications,
        reports,
        activeView,
        selectedCategory,
        searchTerm,
        sidebarOpen,
        toast,
        templatesLoading,
        templatesError,
        categoriesLoading,
        isAddModalOpen,
        isChatDrawerOpen,
        draftToEdit,
        selectedTemplateForDetail,
        selectedRequestForDrawer,
        selectedApprovalForDrawer,
        selectedTemplateForFill,
        selectedReportForView,
        selectedReportForSend,
        selectedReportForReturn,
        selectedReportForReject,
        selectedReportForSign,
        reportToEdit,
        isProfileModalOpen,
        setActiveView,
        setSelectedCategory,
        setSearchTerm,
        setSidebarOpen,
        markNotificationRead,
        markAllNotificationsRead,
        showToast,
        openAddTemplateModal,
        closeAddTemplateModal,
        openTemplateDetail,
        closeTemplateDetail,
        openRequestDetail,
        closeRequestDetail,
        openApprovalDetail,
        closeApprovalDetail,
        openFillReportModal,
        closeFillReportModal,
        openReportViewModal,
        closeReportViewModal,
        openSendReportModal,
        closeSendReportModal,
        openReturnReportModal,
        closeReturnReportModal,
        openRejectReportModal,
        closeRejectReportModal,
        openSignReportModal,
        closeSignReportModal,
        openProfileModal,
        closeProfileModal,
        toggleChatDrawer,
        saveTemplateDraft,
        submitTemplateForApproval,
        approveTemplate,
        rejectTemplate,
        returnTemplateForRevision,
        claimTemplateReview,
        addRequestComment,
        createReportInstance,
        ensureReportInstance,
        updateReportInstance,
        markReportCompleted,
        sendReport,
        returnReport,
        rejectReport,
        signReport,
        addReportComment,
        refreshTemplates,
        clearTemplatesError,
        refreshReports,
        hasPermission,
        getCategoryTemplateCount,
        getTotalCategoryCount,
        getApprovedTemplateCategoryCount,
        getApprovedTemplates,
        getPendingApprovalsForUser,
        getMyRequestsForUser,
        getReportsAwaitingMyReview,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
