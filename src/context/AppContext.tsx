import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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
import { prepareReportForEditing } from '../features/reports/reportEditPreparation';
import { AppError, normalizeError } from '../lib/errors/errorHandling';
import { templateInsightsService } from '../features/insights/templateInsightsService';
import { configurationService } from '../features/configuration/services/configurationService';
import { getSupabaseBrowserClient } from '../lib/supabase/client';
import type { InsightsAccessResolution } from '../features/insights/featureAccessTypes';
import { delegationService } from '../features/delegations/delegationService';
import type { AuthorityContext, AuthorityContextStatus, OperationalSubject } from '../features/delegations/delegationTypes';
import { belongsToOperationalSubject, isOperationalRecipient } from '../features/delegations/operationalWorkspaceFilters';
import { canCreateTemplateBackedReport, canAuthorTemplate, confirmsDelegatedAuthority, confirmsOwnAuthority, hasEffectiveAuthorityPermission } from '../features/delegations/effectiveAuthority';
import { getOperationalReportAssignment, hasOperationalReportSignatureAssignment } from '../features/delegations/operationalReportAssignment';
import { useAuth } from '../features/auth/useAuth';
import { isAuthenticatedSessionReady, isAuthenticationFailure, sameAuthenticatedActor, runSingleFlight, runExclusiveAction, SingleAuthRecovery, authorityContextIdentity } from '../features/workspace/workspaceRequestControl';
import { countDev, measureDev } from '../shared/devPerformance';

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
  insightsAccess: InsightsAccessResolution;
  authorityContextStatus: AuthorityContextStatus;
  authorityContext: AuthorityContext | null;
  operationalSubject: OperationalSubject | null;
  operationalSubjectUserId: string | null;
  isDelegatedMode: boolean;
  operationalWorkspaceLoading: boolean;
  operationalWorkspaceError: string | null;
  reportsLoading: boolean;
  reportsError: string | null;
  activityTimelineWasLoaded: boolean;
  markActivityTimelineLoaded: () => void;
  /** Safe navigation affordance for the backend-supported read-only workspace only. */
  canOpenOperationalReadView: (view: 'reports' | 'templates' | 'my-requests') => boolean;
  selectedCategory: string | null;
  searchTerm: string;
  sidebarOpen: boolean;
  toast: ToastState | null;
  templatesLoading: boolean;
  templatesError: string | null;
  templateArchiveRevision: number;
  lastArchivedTemplateId: string | null;
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
  reportEditLoadingId: string | null;

  // Navigation & UI Actions
  setActiveView: (view: ViewType) => void;
  refreshInsightsAccess: () => Promise<boolean | null>;
  refreshAuthorityContext: () => Promise<AuthorityContext | null>;
  revalidateAuthorityContext: () => Promise<AuthorityContext | null>;
  getReportDetail: (reportId: string) => Promise<ReportInstance>;
  selectDelegationContext: (delegationId: string) => Promise<boolean>;
  openDelegatedReportNotification: (delegationId: string, reportId: string) => Promise<boolean>;
  clearDelegationContext: () => Promise<boolean>;
  hasTemplateApprovalPermission: (permission: 'template_approvals.view' | 'template_approvals.approve' | 'template_approvals.reject' | 'template_approvals.comment') => boolean;
  hasOperationalPermission: (permission: PermissionKey) => boolean;
  refreshTemplateComments: (templateId: string) => Promise<void>;
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
  archiveTemplate: (templateId: string, reason: string) => Promise<void>;
  addRequestComment: (templateId: string, message: string) => void;

  // Report Instance Handlers
  createReportInstance: (
    payload: string | { templateId: string; data?: Record<string, any>; title?: string }
  ) => Promise<ReportInstance | undefined>;
  createUploadedReport: (title: string) => Promise<ReportInstance>;
  attachUploadedReportDocument: (reportId: string, assetId: string) => Promise<void>;

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
  sendReport: (reportId: string, recipientId: string | string[], senderNote?: string, signaturePayload?: any, sourceType?: ReportInstance['sourceType']) => Promise<void>;
  returnReport: (reportId: string, feedback: string, sourceType?: ReportInstance['sourceType']) => Promise<void>;
  rejectReport: (reportId: string, reason: string) => Promise<void>;
  signReport: (reportId: string, payload?: any) => Promise<void>;
  addReportComment: (reportId: string, message: string) => void;

  claimTemplateReview: (templateId: string) => Promise<WidgetTemplate | undefined>;
  refreshTemplates: (forceApprovals?: boolean) => Promise<void>;
  clearTemplatesError: () => void;
  refreshReports: () => Promise<void | boolean>;
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
  const { status: authStatus, session, sessionGeneration, refreshPrincipal, isCurrentAuthenticatedSession } = useAuth();
  const authenticatedSessionReady = isAuthenticatedSessionReady(authStatus, session?.user.id, currentUser.id);
  const authSessionKey = `${currentUser.id}:${sessionGeneration}`;
  const authRecoveryRef = useRef(new SingleAuthRecovery());
  const categoryFlights = useRef(new Map<string, Promise<Category[]>>());
  const templateFlights = useRef(new Map<string, Promise<void>>());
  const reportFlights = useRef(new Map<string, Promise<boolean>>());
  const notificationFlights = useRef(new Map<string, Promise<void>>());
  const authorityFlights = useRef(new Map<string, Promise<AuthorityContext | null>>());
  const revalidationFlights = useRef(new Map<string, Promise<AuthorityContext | null>>());
  const reportDetailFlights = useRef(new Map<string, Promise<ReportInstance>>());
  const reportDetailStamps = useRef(new WeakMap<ReportInstance, string>());
  const mountedRef = useRef(true);
  const recoverOnceAndRetry = async <T,>(operation: () => Promise<T>): Promise<T> => {
    if (!authenticatedSessionReady) {
      const error = new Error('Authenticated session is not ready.') as Error & { code: string };
      error.code = 'AUTH_SESSION_MISSING';
      throw error;
    }
    const expectedWorkspaceRequest = workspaceLoadRequest.current;
    const isCurrent = () => mountedRef.current
      && isCurrentAuthenticatedSession(currentUser.id, sessionGeneration)
      && expectedWorkspaceRequest === workspaceLoadRequest.current;
    return authRecoveryRef.current.run({
      key: authSessionKey,
      operation,
      isAuthenticationFailure,
      recover: () => measureDev('auth.recovery', async () => sameAuthenticatedActor(currentUser, await refreshPrincipal())),
      isCurrent,
      onRetry: () => countDev('auth.recovery.retry'),
    });
  };
  const [users] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [myTemplates, setMyTemplates] = useState<WidgetTemplate[]>([]);
  const [pendingTemplateApprovals, setPendingTemplateApprovals] = useState<WidgetTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [templateArchiveRevision, setTemplateArchiveRevision] = useState(0);
  const [lastArchivedTemplateId, setLastArchivedTemplateId] = useState<string | null>(null);
  const [approvalRecords] = useState<ApprovalRecord[]>([]);
  const [requestComments, setRequestComments] = useState<RequestComment[]>([]);
  const [reportComments] = useState<ReportComment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<ReportInstance[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportEditLoadingId, setReportEditLoadingId] = useState<string | null>(null);

  const refreshCategories = async () => {
    if (!authenticatedSessionReady) return [];
    return runSingleFlight(categoryFlights.current, authSessionKey, async () => {
    setCategoriesLoading(true);
    try {
      const data = await measureDev('templateService.getCategories', () => recoverOnceAndRetry(() => templateService.getCategories()));
      if (mountedRef.current) setCategories(data);
      return data;
    }
    catch (error: any) {
      if (import.meta.env.DEV) console.warn('[WidgetFlow categories]', { code: error?.code, status: error?.status });
      return [];
    }
    finally { if (mountedRef.current) setCategoriesLoading(false); }
    });
  };
  useEffect(() => { void refreshCategories(); }, []);

  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [insightsAccess, setInsightsAccess] = useState<InsightsAccessResolution>({
    status: 'loading', enabled: false, insightsAllowed: false, protectedAdmin: false,
  });
  const [authorityContextStatus, setAuthorityContextStatus] = useState<AuthorityContextStatus>('loading');
  const authorityContextStatusRef = useRef<AuthorityContextStatus>('loading');
  authorityContextStatusRef.current = authorityContextStatus;
  const [authorityContext, setAuthorityContext] = useState<AuthorityContext | null>(null);
  const [operationalWorkspaceLoading, setOperationalWorkspaceLoading] = useState(true);
  const [operationalWorkspaceError, setOperationalWorkspaceError] = useState<string | null>(null);
  const [activityTimelineWasLoaded, setActivityTimelineWasLoaded] = useState(false);
  const insightsAccessRequest = useRef(0);
  const authorityContextRequest = useRef(0);
  const authorityTransitionLock = useRef(false);
  const templateLoadRequest = useRef(0);
  const reportLoadRequest = useRef(0);
  const workspaceLoadRequest = useRef(0);
  const reportViewRequest = useRef(0);
  const reportSendRequest = useRef(0);
  const reportSignRequest = useRef(0);
  const reportEditRequest = useRef(0);
  const reportDetailRevision = useRef(0);
  const workspaceLoadingRef = useRef(true);
  const authorityContextRef = useRef<AuthorityContext | null>(null);
  const expiryRefreshAttempt = useRef<string | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      authorityContextRequest.current += 1;
      workspaceLoadRequest.current += 1;
      templateLoadRequest.current += 1;
      reportLoadRequest.current += 1;
      reportEditRequest.current += 1;
      reportDetailFlights.current.clear();
      reportDetailRevision.current += 1;
      authRecoveryRef.current.clear();
    };
  }, []);
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

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const newToast = { id: Date.now(), message, type };
    setToast(newToast);
    setTimeout(() => {
      setToast((current) => (current?.id === newToast.id ? null : current));
    }, 4000);
  }, []);

  const refreshInsightsAccess = useCallback(async (): Promise<boolean | null> => {
    const requestId = ++insightsAccessRequest.current;
    setInsightsAccess((current) => ({ ...current, status: 'loading', insightsAllowed: false }));
    try {
      if (!isSupabasePrincipal(currentUser)) throw new Error('Authenticated feature access is unavailable.');
      const result = await configurationService.currentFeatureAccess('insights');
      if (requestId !== insightsAccessRequest.current) return null;
      setInsightsAccess({
        status: 'ready', enabled: result.enabled, insightsAllowed: result.allowed,
        protectedAdmin: result.protectedAdmin,
      });
      return result.allowed;
    } catch {
      if (requestId === insightsAccessRequest.current) {
        setInsightsAccess({ status: 'error', enabled: false, insightsAllowed: false, protectedAdmin: false });
      }
      return null;
    }
  }, [currentUser]);

  const navigateToView = (view: ViewType) => {
    // Match MainContent's guard before changing selection. Otherwise a denied
    // route silently renders Dashboard while the clicked item looks selected.
    if ((view === 'templates' || view === 'reports' || view === 'my-requests')
      && !canOpenOperationalReadView(view)) {
      showToast("Your current authority doesn't have permission to open this workspace.", 'warning');
      return;
    }
    if (view !== 'insights') {
      setActiveView(view);
      return;
    }
    void refreshInsightsAccess().then((allowed) => {
      if (allowed === true) setActiveView('insights');
      else if (allowed === false) showToast("You don't have permission to view Insights.", 'warning');
      else showToast("We couldn't verify your Insights access.", 'warning');
    });
  };

  useEffect(() => {
    void refreshInsightsAccess();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshInsightsAccess();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const { data: authListener } = getSupabaseBrowserClient().auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        void refreshInsightsAccess();
      }
    });
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      authListener.subscription.unsubscribe();
    };
  }, [refreshInsightsAccess]);

  useEffect(() => {
    if (activeView !== 'insights') return;
    if (insightsAccess.status === 'ready' && !insightsAccess.insightsAllowed) {
      setActiveView('dashboard');
      showToast('Your access to Insights has changed.', 'warning');
    } else if (insightsAccess.status === 'error') {
      setActiveView('dashboard');
      showToast("We couldn't verify your Insights access.", 'warning');
    }
  }, [activeView, insightsAccess.status, insightsAccess.insightsAllowed]);

  // Modal / Drawer Handlers
  const openAddTemplateModal = (draft?: WidgetTemplate | null) => {
    setDraftToEdit(draft || null);
    setIsAddModalOpen(true);
  };

  const closeAddTemplateModal = () => {
    setIsAddModalOpen(false);
    setDraftToEdit(null);
  };

  const refreshTemplateComments = async (templateId: string) => {
    try {
      const comments = await templateService.getTemplateComments(templateId);
      setRequestComments((previous) => [...previous.filter((comment) => comment.templateId !== templateId), ...comments]);
    } catch {
      setRequestComments((previous) => previous.filter((comment) => comment.templateId !== templateId));
    }
  };

  const openTemplateDetail = (template: WidgetTemplate) => {
    setSelectedTemplateForDetail(template);
  };

  const closeTemplateDetail = () => {
    setSelectedTemplateForDetail(null);
  };

  const openRequestDetail = (template: WidgetTemplate) => {
    setSelectedRequestForDrawer(template);
    void refreshTemplateComments(template.id);
  };

  const closeRequestDetail = () => {
    setSelectedRequestForDrawer(null);
  };

  const openApprovalDetail = (template: WidgetTemplate) => {
    setSelectedApprovalForDrawer(template);
    void refreshTemplateComments(template.id);
  };

  const closeApprovalDetail = () => {
    setSelectedApprovalForDrawer(null);
  };

  const openFillReportModal = (template: WidgetTemplate, reportInstanceToEdit?: ReportInstance | null) => {
    if (!reportInstanceToEdit && !canCreateTemplateBackedReport(hasOperationalPermission)) {
      notifyOperationalActionBlocked();
      return;
    }
    if (template.isPaused && !reportInstanceToEdit) {
      showToast("This Template is temporarily paused and can't be used to create a new Report.", 'warning');
      return;
    }
    const requestId = ++reportEditRequest.current;
    if (!reportInstanceToEdit) {
      setReportEditLoadingId(null);
      reportPersistenceRef.current.seed(null);
      setSelectedTemplateForFill(template);
      setReportToEdit(null);
      return;
    }
    setReportEditLoadingId(reportInstanceToEdit.id);
    const workspaceRequest = workspaceLoadRequest.current;
    void prepareReportForEditing(
      reportInstanceToEdit,
      getReportDetail,
      () => mountedRef.current && requestId === reportEditRequest.current
        && workspaceRequest === workspaceLoadRequest.current
        && isCurrentAuthenticatedSession(currentUser.id, sessionGeneration),
      isSupabasePrincipal(currentUser),
      canReuseReportDetail,
    ).then((detail) => {
      reportPersistenceRef.current.seed(detail);
      setReportToEdit(detail);
      setSelectedTemplateForFill(template);
    }).catch(() => {
      if (mountedRef.current && requestId === reportEditRequest.current) {
        showToast('We couldn’t load this report for editing. Please try again.', 'warning');
      }
    }).finally(() => {
      if (mountedRef.current && requestId === reportEditRequest.current) setReportEditLoadingId(null);
    });
  };

  const closeFillReportModal = () => {
    reportEditRequest.current += 1;
    setReportEditLoadingId(null);
    reportPersistenceRef.current.clear();
    setSelectedTemplateForFill(null);
    setReportToEdit(null);
  };

  const canReuseReportDetail = (report: ReportInstance): boolean =>
    Boolean(report.detailLoaded)
    && reportDetailStamps.current.get(report) === `${authSessionKey}:${workspaceLoadRequest.current}:${reportDetailRevision.current}`;

  const hydrateReportDetail = async (report: ReportInstance): Promise<ReportInstance> => {
    if (canReuseReportDetail(report) || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(report.id)) return report;
    return getReportDetail(report.id);
  };

  const getReportDetail = (reportId: string): Promise<ReportInstance> => {
    const workspaceRequest = workspaceLoadRequest.current;
    const detailRevision = reportDetailRevision.current;
    const flightKey = `${authSessionKey}:${workspaceRequest}:${detailRevision}:${reportId}`;
    if (reportDetailFlights.current.has(flightKey)) countDev('reportDetail.singleFlightJoin');
    return runSingleFlight(reportDetailFlights.current, flightKey, async () => {
      const detail = await recoverOnceAndRetry(() => reportService.get(reportId));
      if (!mountedRef.current || workspaceRequest !== workspaceLoadRequest.current
        || detailRevision !== reportDetailRevision.current
        || !isCurrentAuthenticatedSession(currentUser.id, sessionGeneration)) {
        throw new Error('WORKSPACE_CHANGED');
      }
      reportDetailStamps.current.set(detail, `${authSessionKey}:${workspaceRequest}:${detailRevision}`);
      return detail;
    });
  };

  const openReportViewModal = (report: ReportInstance) => {
    const requestId = ++reportViewRequest.current;
    const ready = canReuseReportDetail(report) || !isSupabasePrincipal(currentUser);
    setSelectedReportForView(ready ? report : { ...report, detailLoaded: false });
    if (!ready) void hydrateReportDetail(report).then((detail) => {
      if (mountedRef.current && requestId === reportViewRequest.current) setSelectedReportForView(detail);
    }).catch((err) => {
      if (requestId === reportViewRequest.current) {
        setSelectedReportForView(null);
        showToast('We couldn’t load report details. Please try again.', 'warning');
        if (import.meta.env.DEV) console.warn('[WidgetFlow report detail]', { code: err?.code, status: err?.status });
      }
    });
  };

  const closeReportViewModal = () => {
    reportViewRequest.current += 1;
    setSelectedReportForView(null);
  };

  const openSendReportModal = (report: ReportInstance) => {
    // UUID reports must use the immutable template-version snapshot. Create/complete
    // RPC responses are intentionally lightweight, so hydrate the authoritative
    // detail before mounting the send modal.
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(report.id)) {
      const requestId = ++reportSendRequest.current;
      setSelectedReportForSend(null);
      void hydrateReportDetail(report)
        .then((detail) => { if (mountedRef.current && requestId === reportSendRequest.current) setSelectedReportForSend(detail); })
        .catch((err) => {
          if (requestId !== reportSendRequest.current) return;
          setSelectedReportForSend(null);
          showToast('Unable to load the historical report version before sending.', 'warning');
          if (import.meta.env.DEV) console.warn('[WidgetFlow report send detail]', { code: err?.code, status: err?.status });
        });
      return;
    }
    setSelectedReportForSend(report);
  };

  const closeSendReportModal = () => {
    reportSendRequest.current += 1;
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
    const requestId = ++reportSignRequest.current;
    const isPersistedReport = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(report.id);
    const ready = canReuseReportDetail(report) || !isPersistedReport;
    setSelectedReportForSign(ready ? report : null);
    if (!ready && isPersistedReport) {
      void hydrateReportDetail(report).then((detail) => {
        if (mountedRef.current && requestId === reportSignRequest.current) setSelectedReportForSign(detail);
      }).catch((error) => {
        if (requestId !== reportSignRequest.current) return;
        showToast('Unable to load report signature details. Please try again.', 'warning');
        if (import.meta.env.DEV) console.warn('[WidgetFlow report signature detail]', { code: (error as any)?.code, status: (error as any)?.status });
      });
    }
  };

  const closeSignReportModal = () => {
    reportSignRequest.current += 1;
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
  const refreshTemplates = async (forceApprovals = false, expectedWorkspaceRequest = workspaceLoadRequest.current) => {
    if (!authenticatedSessionReady || expectedWorkspaceRequest !== workspaceLoadRequest.current) return;
    const flightKey = `${authSessionKey}:${expectedWorkspaceRequest}`;
    return runSingleFlight(templateFlights.current, flightKey, async () => {
    const requestId = ++templateLoadRequest.current;
    const isCurrentRequest = () => mountedRef.current && requestId === templateLoadRequest.current && expectedWorkspaceRequest === workspaceLoadRequest.current;
    setTemplatesLoading(true); setTemplatesError(null);
    try {
      if (isSupabasePrincipal(currentUser)) {
        const { approved, owned, pending } = await recoverOnceAndRetry(() =>
          templateService.getWorkspaceCollections(forceApprovals || authorityContextStatus === 'ready'));
        if (!isCurrentRequest()) return;
        setTemplates(approved);
        // Preserve return metadata only within the same authenticated actor's
        // collection; each workspace transition clears this cache first.
        setMyTemplates((previous) => owned.map((template) => {
          const prior = previous.find((candidate) => candidate.id === template.id);
          if (template.status === 'Draft' && prior?.status === 'Draft' && prior.returnedAt && !template.returnedAt) {
            return { ...template, returnedAt: prior.returnedAt, returnReason: prior.returnReason };
          }
          return template;
        }));
        setPendingTemplateApprovals(pending);
      } else {
        const data = await recoverOnceAndRetry(() => templateService.getTemplates());
        if (!isCurrentRequest()) return;
        setTemplates(data);
        setMyTemplates(data.filter((template) => template.createdById === currentUser.id));
        setPendingTemplateApprovals([]);
      }
    } catch (err: any) {
      if (isCurrentRequest()) {
        setTemplatesError('We couldn’t refresh templates. Please try again.');
        setTemplates([]); setMyTemplates([]); setPendingTemplateApprovals([]);
      }
      if (import.meta.env.DEV) console.warn('[WidgetFlow templates]', { code: err?.code, status: err?.status });
    } finally {
      if (isCurrentRequest()) setTemplatesLoading(false);
    }
    });
  };
  // Approval Inbox and My Requests are long-lived views. Refresh their
  // Supabase-backed collections when entered so an already-open session sees
  // newly submitted or updated templates without requiring a full reload.
  useEffect(() => {
    if (operationalWorkspaceLoading) return;
    if (activeView === 'approvals' || activeView === 'my-requests') {
      void refreshTemplates();
    }
  }, [activeView]);
  const clearTemplatesError = () => setTemplatesError(null);
  const markActivityTimelineLoaded = useCallback(() => setActivityTimelineWasLoaded(true), []);

  const refreshReports = async (expectedWorkspaceRequest = workspaceLoadRequest.current) => {
    if (!authenticatedSessionReady || expectedWorkspaceRequest !== workspaceLoadRequest.current) return false;
    const flightKey = `${authSessionKey}:${expectedWorkspaceRequest}`;
    return runSingleFlight(reportFlights.current, flightKey, async () => {
    reportDetailRevision.current += 1;
    reportDetailFlights.current.clear();
    const requestId = ++reportLoadRequest.current;
    const isCurrentRequest = () => mountedRef.current && requestId === reportLoadRequest.current && expectedWorkspaceRequest === workspaceLoadRequest.current;
    setReportsLoading(true);
    setReportsError(null);
    try {
      const data = await recoverOnceAndRetry(() => reportService.list());
      if (isCurrentRequest()) setReports(data);
      return isCurrentRequest();
    } catch (err: any) {
      if (isCurrentRequest()) {
        setReports([]);
        setReportsError('We couldn’t refresh reports. Please try again.');
      }
      if (import.meta.env.DEV) console.warn('[WidgetFlow reports]', { code: err?.code, status: err?.status });
      return false;
    } finally {
      if (isCurrentRequest()) setReportsLoading(false);
    }
    });
  };

  const refreshNotifications = async () => {
    if (!authenticatedSessionReady) return;
    return runSingleFlight(notificationFlights.current, authSessionKey, async () => {
    try {
      if (isSupabasePrincipal(currentUser)) {
        const data = await recoverOnceAndRetry(() => reportService.listNotifications(currentUser.id));
        if (mountedRef.current) setNotifications(data);
      } else {
        const data = await recoverOnceAndRetry(() => apiService.getNotifications());
        if (mountedRef.current) setNotifications(data);
      }
    } catch (err: any) {
      if (import.meta.env.DEV) console.warn('[WidgetFlow notifications]', { code: err?.code, status: err?.status });
    }
    });
  };
  useEffect(() => { void refreshNotifications(); }, [currentUser.id]);

  const clearWorkspaceDetails = () => {
    reportViewRequest.current += 1;
    reportSendRequest.current += 1;
    reportSignRequest.current += 1;
    reportEditRequest.current += 1;
    setReportEditLoadingId(null);
    reportDetailFlights.current.clear();
    reportDetailRevision.current += 1;
    setSelectedCategory(null);
    setSearchTerm('');
    setDraftToEdit(null);
    setSelectedTemplateForDetail(null);
    setSelectedRequestForDrawer(null);
    setSelectedApprovalForDrawer(null);
    setSelectedTemplateForFill(null);
    setSelectedReportForView(null);
    setSelectedReportForSend(null);
    setSelectedReportForReturn(null);
    setSelectedReportForReject(null);
    setSelectedReportForSign(null);
    setReportToEdit(null);
    setIsAddModalOpen(false);
    setIsChatDrawerOpen(false);
    setIsProfileModalOpen(false);
    setRequestComments([]);
  };

  const assertContextActor = (context: AuthorityContext) => {
    if (context.actor.userId !== currentUser.id) throw new Error('Authority context does not match the authenticated actor');
  };

  const beginWorkspaceTransition = () => {
    const requestId = ++workspaceLoadRequest.current;
    // Invalidate any slow responses from the previous operational subject.
    templateLoadRequest.current += 1;
    reportLoadRequest.current += 1;
    setOperationalWorkspaceLoading(true);
    workspaceLoadingRef.current = true;
    setOperationalWorkspaceError(null);
    authorityContextRef.current = null;
    setAuthorityContext(null);
    setTemplatesLoading(true);
    setTemplates([]); setMyTemplates([]); setPendingTemplateApprovals([]); setReports([]);
    clearWorkspaceDetails();
    return requestId;
  };

  const loadWorkspaceForContext = async (context: AuthorityContext, requestId: number, workspaceRequest: number) => {
    const previous = authorityContextRef.current;
    if (previous && previous.mode !== context.mode) setActiveView('dashboard');
    authorityContextRef.current = context;
    setAuthorityContext(context);
    setAuthorityContextStatus('ready');
    try {
      // Templates are optional navigation data; start them in the background so
      // report-capable users are not held behind approvals/library queries.
      void refreshTemplates(true, workspaceRequest);
      const reportsReady = await refreshReports(workspaceRequest);
      if (!reportsReady && requestId === authorityContextRequest.current && workspaceRequest === workspaceLoadRequest.current) {
        setOperationalWorkspaceError('Your authority changed successfully, but some workspace data could not be refreshed. Please retry.');
      }
    } catch {
      if (requestId === authorityContextRequest.current && workspaceRequest === workspaceLoadRequest.current) {
        setOperationalWorkspaceError('Your authority changed successfully, but some workspace data could not be refreshed. Please retry.');
      }
    } finally {
      if (requestId === authorityContextRequest.current && workspaceRequest === workspaceLoadRequest.current) {
        workspaceLoadingRef.current = false;
        setOperationalWorkspaceLoading(false);
      }
    }
  };

  const refreshAuthorityContext = async (): Promise<AuthorityContext | null> => {
    if (!authenticatedSessionReady) return null;
    return runSingleFlight(authorityFlights.current, authSessionKey, async () => {
    const requestId = ++authorityContextRequest.current;
    const workspaceRequest = beginWorkspaceTransition();
    setAuthorityContextStatus('loading');
    try {
      let context: AuthorityContext;
      if (!isSupabasePrincipal(currentUser)) {
        context = {
          mode: 'own', delegation: null, staleSelection: false,
          actor: { userId: currentUser.id, fullName: currentUser.name, roleId: String(currentUser.roleId ?? ''), roleName: currentUser.role },
          operationalSubject: {
            userId: currentUser.id,
            fullName: currentUser.name,
            roleId: String(currentUser.roleId ?? ''),
            roleKey: currentUser.roleKey ?? '',
            roleName: currentUser.role,
            governanceLevel: currentUser.governanceLevel ?? null,
          },
          authority: {
            roleId: String(currentUser.roleId ?? ''),
            roleKey: currentUser.roleKey ?? '',
            roleName: currentUser.role,
            governanceLevel: currentUser.governanceLevel ?? null,
            effectivePermissions: currentUser.permissions,
          },
        };
      } else {
        context = await measureDev('authorityContext.refresh', () => recoverOnceAndRetry(() => delegationService.currentAuthorityContext()));
      }
      if (requestId !== authorityContextRequest.current) return null;
      assertContextActor(context);
      const wasDelegated = authorityContextRef.current?.mode === 'delegated';
      await loadWorkspaceForContext(context, requestId, workspaceRequest);
      if (context.staleSelection || (wasDelegated && context.mode !== 'delegated')) {
        showToast('Your delegated authority is no longer active. Your own workspace has been restored.', 'warning');
      }
      return context;
    } catch {
      if (requestId === authorityContextRequest.current) {
        authorityContextRef.current = null;
        setAuthorityContext(null);
        setAuthorityContextStatus('error');
        setOperationalWorkspaceError('Your operational workspace could not be refreshed. Please retry.');
        workspaceLoadingRef.current = true;
        setOperationalWorkspaceLoading(false);
        setTemplatesLoading(false);
        setReportsLoading(false);
      }
      return null;
    }
    });
  };

  useEffect(() => {
    if (authenticatedSessionReady) void refreshAuthorityContext();
  }, [currentUser.id]);

  const revalidateAuthorityContext = async (): Promise<AuthorityContext | null> => {
    if (!authenticatedSessionReady) return null;
    if (workspaceLoadingRef.current || authorityContextStatusRef.current !== 'ready') return authorityContextRef.current;
    const before = authorityContextRef.current;
    if (!before) return refreshAuthorityContext();
    const flightKey = `${authSessionKey}:${workspaceLoadRequest.current}`;
    return runSingleFlight(revalidationFlights.current, flightKey, async () => {
      const requestId = authorityContextRequest.current;
      try {
        const context = isSupabasePrincipal(currentUser)
          ? await measureDev('authorityContext.revalidate', () => recoverOnceAndRetry(() => delegationService.currentAuthorityContext()))
          : before;
        if (requestId !== authorityContextRequest.current) return null;
        assertContextActor(context);
        if (authorityContextIdentity(context) === authorityContextIdentity(before)) {
          authorityContextRef.current = context;
          return context;
        }

        const transitionRequest = ++authorityContextRequest.current;
        const workspaceRequest = beginWorkspaceTransition();
        setAuthorityContextStatus('loading');
        await loadWorkspaceForContext(context, transitionRequest, workspaceRequest);
        if (context.staleSelection || (before.mode === 'delegated' && context.mode !== 'delegated')) {
          showToast('Your delegated authority is no longer active. Your own workspace has been restored.', 'warning');
        }
        return context;
      } catch {
        if (requestId !== authorityContextRequest.current) return null;
        const transitionRequest = ++authorityContextRequest.current;
        beginWorkspaceTransition();
        if (transitionRequest === authorityContextRequest.current) {
          authorityContextRef.current = null;
          setAuthorityContext(null);
          setAuthorityContextStatus('error');
          setOperationalWorkspaceError('Your operational workspace could not be revalidated. Please retry.');
          workspaceLoadingRef.current = true;
          setOperationalWorkspaceLoading(false);
          setTemplatesLoading(false);
          setReportsLoading(false);
        }
        return null;
      }
    });
  };

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void revalidateAuthorityContext();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentUser.id]);

  const selectDelegationContext = (delegationId: string): Promise<boolean> => runExclusiveAction(authorityTransitionLock, async () => {
    const requestId = ++authorityContextRequest.current;
    const workspaceRequest = beginWorkspaceTransition();
    setAuthorityContextStatus('loading');
    // The selection RPC may have committed even if its response was lost. Its
    // result is not considered successful until the canonical current-context
    // read confirms the exact delegation and operational subject.
    try {
      await recoverOnceAndRetry(() => delegationService.selectContext(delegationId));
    } catch {
      // Re-read below; a transport failure alone does not prove the transition failed.
    }
    if (requestId !== authorityContextRequest.current) return false;

    let confirmedContext: AuthorityContext | null = null;
    try {
      confirmedContext = await recoverOnceAndRetry(() => delegationService.currentAuthorityContext());
      assertContextActor(confirmedContext);
    } catch {
      confirmedContext = null;
    }
    if (requestId !== authorityContextRequest.current) return false;

    if (confirmedContext && confirmsDelegatedAuthority(confirmedContext, delegationId)) {
      await loadWorkspaceForContext(confirmedContext, requestId, workspaceRequest);
      return true;
    }

    // A second canonical refresh restores the server's actual selection (which
    // may have changed concurrently) and also covers a failed first context read.
    const refreshedContext = await refreshAuthorityContext();
    if (confirmsDelegatedAuthority(refreshedContext, delegationId)) return true;
    if (refreshedContext?.mode === 'delegated') {
      showToast('This delegated authority is no longer active.', 'warning');
    } else {
      showToast('We could not switch to this delegated authority. Please try again.', 'warning');
    }
    return false;
  }, false);

  const openDelegatedReportNotification = async (delegationId: string, reportId: string): Promise<boolean> => {
    const sameSelectedDelegation = authorityContextRef.current?.mode === 'delegated'
      && authorityContextRef.current.delegation?.delegationId === delegationId
      && !authorityContextRef.current.staleSelection;

    let context: AuthorityContext | null = null;
    if (sameSelectedDelegation) {
        context = await revalidateAuthorityContext();
    } else if (await selectDelegationContext(delegationId)) {
      context = authorityContextRef.current;
    }

    if (!context || context.mode !== 'delegated' || context.delegation?.delegationId !== delegationId || context.staleSelection) {
      if (authorityContextRef.current?.mode === 'delegated') await refreshAuthorityContext();
      setActiveView('dashboard');
      showToast('This delegated authority is no longer active.', 'warning');
      return false;
    }

    try {
      // This read is deliberately after server-side context selection/revalidation.
      const report = await getReportDetail(reportId);
      const latestContext = await revalidateAuthorityContext();
      if (!latestContext) throw new Error('Authority context could not be revalidated.');
      assertContextActor(latestContext);
      if (latestContext.mode !== 'delegated' || latestContext.delegation?.delegationId !== delegationId || latestContext.staleSelection) {
        await revalidateAuthorityContext();
        setActiveView('dashboard');
        showToast('This delegated authority is no longer active.', 'warning');
        return false;
      }
      setReports((previous) => previous.some((item) => item.id === report.id)
        ? previous.map((item) => item.id === report.id ? report : item)
        : [...previous, report]);
      setSelectedReportForView(report);
      setActiveView('reports');
      return true;
    } catch (error) {
      const latestContext = await revalidateAuthorityContext();
      if (!latestContext || latestContext.mode !== 'delegated' || latestContext.delegation?.delegationId !== delegationId || latestContext.staleSelection) {
        setActiveView('dashboard');
        showToast('This delegated authority is no longer active.', 'warning');
        return false;
      }
      showToast(normalizeError(error).message || 'This report is no longer available.', 'warning');
      setActiveView('reports');
      return false;
    }
  };

  const clearDelegationContext = (): Promise<boolean> => runExclusiveAction(authorityTransitionLock, async () => {
    const requestId = ++authorityContextRequest.current;
    const workspaceRequest = beginWorkspaceTransition();
    setAuthorityContextStatus('loading');
    try {
      await recoverOnceAndRetry(() => delegationService.clearContext());
    } catch {
      // A lost response does not establish that clearing failed; verify the
      // canonical context before reporting an authority-transition error.
    }
    if (requestId !== authorityContextRequest.current) return false;

    let confirmedContext: AuthorityContext | null = null;
    try {
      confirmedContext = await recoverOnceAndRetry(() => delegationService.currentAuthorityContext());
      assertContextActor(confirmedContext);
    } catch {
      confirmedContext = null;
    }
    if (requestId !== authorityContextRequest.current) return false;

    if (confirmedContext && confirmsOwnAuthority(confirmedContext)) {
      await loadWorkspaceForContext(confirmedContext, requestId, workspaceRequest);
      return true;
    }

    const refreshedContext = await refreshAuthorityContext();
    if (confirmsOwnAuthority(refreshedContext)) return true;
    showToast('We could not return to your own authority. Please try again.', 'warning');
    return false;
  }, false);

  useEffect(() => {
    if (authorityContextStatus !== 'ready' || authorityContext?.mode !== 'delegated' || !authorityContext.delegation) return;
    const expiry = Date.parse(authorityContext.delegation.endAt);
    if (!Number.isFinite(expiry)) return;
    const delegationId = authorityContext.delegation.delegationId;
    if (expiry <= Date.now()) {
      if (expiryRefreshAttempt.current === delegationId) return;
      expiryRefreshAttempt.current = delegationId;
      void revalidateAuthorityContext();
      return;
    }
    let timer = 0;
    let active = true;
    const checkExpiry = () => {
      const remaining = expiry - Date.now();
      if (remaining <= 0) {
        if (active && expiryRefreshAttempt.current !== delegationId) {
          expiryRefreshAttempt.current = delegationId;
          void revalidateAuthorityContext();
        }
        return;
      }
      timer = window.setTimeout(checkExpiry, Math.min(remaining, 2_147_000_000));
    };
    checkExpiry();
    return () => { active = false; window.clearTimeout(timer); };
  }, [authorityContextStatus, authorityContext?.mode, authorityContext?.delegation?.delegationId, authorityContext?.delegation?.endAt]);

  const handleTemplateApprovalError = async (error: unknown, fallback: string) => {
    const safe = normalizeError(error);
    const rawCode = String((error as { code?: unknown } | null)?.code ?? safe.code).toUpperCase();
    const delegationContextErrors = new Set([
      'DELEGATION_CONTEXT_INVALID',
      'DELEGATION_NOT_ACTIVE_OR_NOT_ASSIGNED',
      'FORBIDDEN',
    ]);
    if (
      delegationContextErrors.has(rawCode) &&
      authorityContextStatus === 'ready' &&
      authorityContext?.mode === 'delegated'
    ) {
      const refreshedContext = await revalidateAuthorityContext();
      if (!refreshedContext) {
        showToast('Your delegated authority could not be confirmed. Please retry.', 'warning');
        return;
      }
      if (refreshedContext.mode !== 'delegated') return;
      if (rawCode === 'FORBIDDEN') await refreshTemplates(true);
      const safeMessage = rawCode === 'DELEGATION_CONTEXT_INVALID'
        ? 'Your delegated authority is no longer active.'
        : rawCode === 'DELEGATION_NOT_ACTIVE_OR_NOT_ASSIGNED'
          ? 'This delegation is no longer available.'
          : safe.message || fallback;
      showToast(safeMessage, 'warning');
      return;
    }
    showToast(safe.message || fallback, 'warning');
  };

  const operationalActionBlocked = (permission: PermissionKey) => {
    const context = authorityContextRef.current;
    return workspaceLoadingRef.current
      || authorityContextStatus !== 'ready'
      || operationalWorkspaceLoading
      || !context
      || context.staleSelection
      || !hasEffectiveAuthorityPermission({
        mode: context.mode,
        actorPermissions: currentUser.permissions,
        effectivePermissions: context.authority.effectivePermissions,
      }, permission);
  };
  const notifyOperationalActionBlocked = () => showToast("You don't have permission to perform this action.", 'warning');
  const canSaveTemplateDraft = (existingId?: string) => canAuthorTemplate(hasOperationalPermission, existingId);

  const operationalReportActionBlocked = () => workspaceLoadingRef.current
    || authorityContextStatus !== 'ready'
    || operationalWorkspaceLoading
    || Boolean(authorityContextRef.current?.mode === 'delegated' && authorityContextRef.current.staleSelection);

  const reportActionFailureCode = (error: unknown) => {
    const source = error as { code?: unknown; message?: unknown } | null;
    const explicit = String(source?.code ?? '').toUpperCase();
    if (explicit) return explicit;
    const message = typeof source?.message === 'string' ? source.message : '';
    return message.match(/(?:^|\|\s*)code=([A-Z][A-Z0-9_]+)/i)?.[1]?.toUpperCase() ?? '';
  };

  const handleReportActionFailure = async (
    error: unknown,
    fallback: string,
    errorContext?: 'return' | 'reject' | 'sign',
    actionAuthority?: { delegated: boolean; delegationId: string | null },
  ) => {
    const safe = normalizeError(error, errorContext);
    const actionError = safe.code === 'UNKNOWN'
      ? new AppError('UNKNOWN', fallback, undefined, undefined, errorContext)
      : safe;
    const code = reportActionFailureCode(error);
    const delegated = actionAuthority?.delegated ?? authorityContextRef.current?.mode === 'delegated';
    const refreshableCodes = new Set([
      'DELEGATION_CONTEXT_INVALID', 'DELEGATION_NOT_ACTIVE_OR_NOT_ASSIGNED',
      'FORBIDDEN', 'ASSIGNMENT_NOT_OWNED', 'REPORT_NOT_ACTIONABLE',
      'ASSIGNMENT_NOT_ACTIONABLE', 'ALREADY_SIGNED',
    ]);

    if (delegated && refreshableCodes.has(code)) {
      const context = await revalidateAuthorityContext();
      const sameDelegationStillActive = Boolean(
        context
        && context.mode === 'delegated'
        && !context.staleSelection
        && context.delegation?.delegationId === actionAuthority?.delegationId,
      );
      if (!sameDelegationStillActive) {
        closeReturnReportModal();
        closeRejectReportModal();
        closeSignReportModal();
        closeReportViewModal();
        setActiveView('dashboard');
        const message = context
          ? 'Your delegated authority has ended.'
          : 'Your delegated authority could not be confirmed. Please retry.';
        showToast(message, 'warning');
        return new AppError('FORBIDDEN', message, undefined, undefined, errorContext);
      }
      await refreshReports();
    } else if (refreshableCodes.has(code)) {
      await refreshReports();
    }

    showToast(actionError.message || fallback, 'warning');
    return actionError;
  };

  const operationalSubjectForReportAction = () => {
    const context = authorityContextRef.current;
    return context?.mode === 'delegated' ? context.operationalSubject.userId : currentUser.id;
  };

  const reportAssignmentForAction = (report: ReportInstance | undefined) => {
    if (!report) return null;
    return getOperationalReportAssignment(report, operationalSubjectForReportAction());
  };

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
    if (!canSaveTemplateDraft(existingId)) { notifyOperationalActionBlocked(); return; }
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
    if (!canSaveTemplateDraft(existingId) || !hasOperationalPermission('templates.submit')) {
      notifyOperationalActionBlocked();
      return;
    }
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
      await handleTemplateApprovalError(err, 'We could not approve this template. Please try again.');
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
      await handleTemplateApprovalError(err, 'We could not reject this template. Please try again.');
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
      await handleTemplateApprovalError(err, 'We could not return this template. Please try again.');
    }
  };

  const archiveTemplate = async (templateId: string, reason: string) => {
    if (workspaceLoadingRef.current || authorityContextStatus !== 'ready' || isDelegatedMode) {
      showToast("Insights administration is available only in your own authority context.", 'warning');
      return;
    }
    if (insightsAccess.status !== 'ready' || !insightsAccess.insightsAllowed) {
      throw new Error("You don't have permission to delete this Template.");
    }
    const result = await templateInsightsService.deleteTemplate(templateId, reason);
    setTemplates((previous) => previous.filter((template) => template.id !== templateId));
    setMyTemplates((previous) => previous.filter((template) => template.id !== templateId));
    setPendingTemplateApprovals((previous) => previous.filter((template) => template.id !== templateId));
    await refreshTemplates();
    setSelectedTemplateForDetail((selected) => selected?.id === templateId ? null : selected);
    setSelectedRequestForDrawer((selected) => selected?.id === templateId ? null : selected);
    setSelectedApprovalForDrawer((selected) => selected?.id === templateId ? null : selected);
    setLastArchivedTemplateId(templateId);
    setTemplateArchiveRevision((revision) => revision + 1);
    showToast(result.alreadyArchived ? 'Template was already removed from active use.' : 'Template removed from active use.', 'success');
  };

  // Claim Template Review Action
  const claimTemplateReview = async (templateId: string) => {
    try {
      const tpl = await templateService.claimReview(templateId) as any;
      await refreshTemplates();
      showToast(`Claimed review for "${tpl.name}".`, 'success');
      return tpl;
    } catch (err: any) {
      await handleTemplateApprovalError(err, 'We could not claim this review. Please try again.');
      return undefined;
    }
  };

  // Add Template Comment Action
  const addRequestComment = async (templateId: string, message: string) => {
    try {
      await templateService.addComment(templateId, message);
      await Promise.all([refreshTemplates(), refreshTemplateComments(templateId)]);
      showToast('Comment posted', 'info');
    } catch (err: any) {
      await handleTemplateApprovalError(err, 'We could not post this comment. Please try again.');
    }
  };

  // Create Report Instance from Approved Template
  const ensureReportInstance = async (
    payload: { templateId: string; data?: Record<string, any>; title?: string }
  ): Promise<ReportInstance> => {
    if (operationalActionBlocked('reports.create') || !canCreateTemplateBackedReport(hasOperationalPermission)) { notifyOperationalActionBlocked(); throw new Error('FORBIDDEN'); }
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
    if (operationalActionBlocked('reports.create') || !canCreateTemplateBackedReport(hasOperationalPermission)) { notifyOperationalActionBlocked(); return undefined; }
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
      const safe = normalizeError(err);
      showToast(safe.message, 'warning');
      throw safe;
    }
  };

  const createUploadedReport = async (title: string): Promise<ReportInstance> => {
    if (isDelegatedMode || operationalActionBlocked('reports.create')) { notifyOperationalActionBlocked(); throw new Error('FORBIDDEN'); }
    const report = await reportService.createUploaded(title);
    await refreshReports();
    return report;
  };

  const attachUploadedReportDocument = async (reportId: string, assetId: string) => {
    if (isDelegatedMode || operationalActionBlocked('reports.edit_draft')) { notifyOperationalActionBlocked(); return; }
    await reportService.attachUploadedDocument(reportId, assetId);
    await refreshReports();
  };

  // Update Report Instance
  const updateReportInstance = async (
    reportId: string,
    data: Record<string, string | number>,
    title?: string,
    markAsCompleted?: boolean
  ): Promise<ReportInstance | undefined> => {
    const requiredPermission = markAsCompleted ? 'reports.complete' : 'reports.edit_draft';
    if (operationalActionBlocked(requiredPermission)) { notifyOperationalActionBlocked(); return undefined; }
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
      const safe = normalizeError(err, markAsCompleted ? 'complete' : undefined);
      showToast(safe.message, 'warning');
      throw safe;
    }
  };

  // Mark Report Completed
  const markReportCompleted = async (reportId: string) => {
    if (operationalActionBlocked('reports.complete')) { notifyOperationalActionBlocked(); return; }
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;
    try {
      const detail = canReuseReportDetail(report) ? report : await getReportDetail(reportId);
      await reportService.complete(reportId, detail.data, detail.title);
      await refreshReports();
      showToast('Report marked completed and ready to send', 'success');
    } catch (err: any) {
      showToast(normalizeError(err, 'complete').message, 'warning');
    }
  };

  // Send Report Action
  const sendReport = async (reportId: string, recipientUserId: string | string[], senderNote?: string, signaturePayload?: any, sourceType?: ReportInstance['sourceType']) => {
    const isUploaded = sourceType === 'uploaded' || reports.find((report) => report.id === reportId)?.sourceType === 'uploaded';
    if ((isDelegatedMode && isUploaded) || operationalActionBlocked('reports.send')) { notifyOperationalActionBlocked(); return; }
    try {
      if (sourceType === 'uploaded' || reports.find((report) => report.id === reportId)?.sourceType === 'uploaded') {
        await reportService.sendUploaded(reportId, Array.isArray(recipientUserId) ? recipientUserId : [recipientUserId], senderNote);
        await Promise.all([refreshReports(), refreshNotifications()]);
        showToast('Report sent successfully.', 'success');
        closeSendReportModal();
        return;
      }
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
      const safe = normalizeError(err, 'send');
      showToast(safe.message, 'warning');
      throw safe;
    }
  };

  // Return Report Action
  const returnReport = async (reportId: string, feedback: string, sourceType?: ReportInstance['sourceType']) => {
    if (operationalReportActionBlocked()) { showToast('Please wait for the current operational workspace to finish loading.', 'warning'); throw new Error('WORKSPACE_NOT_READY'); }
    if (!hasOperationalPermission('reports.return')) { notifyOperationalActionBlocked(); throw new Error('FORBIDDEN'); }
    const actionAuthority = {
      delegated: authorityContextRef.current?.mode === 'delegated',
      delegationId: authorityContextRef.current?.mode === 'delegated' ? authorityContextRef.current.delegation?.delegationId ?? null : null,
    };
    try {
      if (!import.meta.env.DEV || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(reportId)) {
        const report = reports.find((r) => r.id === reportId);
        const delegated = authorityContextRef.current?.mode === 'delegated';
        if (delegated && (!report || report.sourceType !== 'template')) throw new Error('REPORT_NOT_ACTIONABLE');
        const assignment = reportAssignmentForAction(report);
        const subjectId = operationalSubjectForReportAction();
        if (!assignment) throw new Error('ASSIGNMENT_NOT_OWNED');
        if (report?.sourceType === 'template' && !hasOperationalReportSignatureAssignment(report, assignment, subjectId)) throw new Error('SIGNATURE_ASSIGNMENT_REQUIRED');
        if (!delegated && (sourceType === 'uploaded' || report?.sourceType === 'uploaded')) await reportService.returnUploaded(reportId, assignment.id, feedback);
        else await reportService.returnReport(reportId, assignment.id, feedback);
        await Promise.all([refreshReports(), refreshNotifications()]);
        showToast('Report returned successfully.', 'success');
        closeReturnReportModal();
        return;
      }
      if (authorityContextRef.current?.mode === 'delegated') throw new Error('REPORT_NOT_ACTIONABLE');
      await apiService.returnReport(reportId, feedback);
      await Promise.all([refreshReports(), refreshNotifications()]);
      showToast('Report returned successfully.', 'success');
      closeReturnReportModal();
    } catch (err: any) {
      throw await handleReportActionFailure(err, 'This report can no longer be returned.', 'return', actionAuthority);
    }
  };

  // Reject Report Action
  const rejectReport = async (reportId: string, reason: string) => {
    if (operationalReportActionBlocked()) { showToast('Please wait for the current operational workspace to finish loading.', 'warning'); throw new Error('WORKSPACE_NOT_READY'); }
    if (!hasOperationalPermission('reports.reject')) { notifyOperationalActionBlocked(); throw new Error('FORBIDDEN'); }
    const actionAuthority = {
      delegated: authorityContextRef.current?.mode === 'delegated',
      delegationId: authorityContextRef.current?.mode === 'delegated' ? authorityContextRef.current.delegation?.delegationId ?? null : null,
    };
    try {
      if (!import.meta.env.DEV || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(reportId)) {
        const report = reports.find((r) => r.id === reportId);
        const delegated = authorityContextRef.current?.mode === 'delegated';
        if (delegated && (!report || report.sourceType !== 'template')) throw new Error('REPORT_NOT_ACTIONABLE');
        const assignment = reportAssignmentForAction(report);
        const subjectId = operationalSubjectForReportAction();
        if (!assignment) throw new Error('ASSIGNMENT_NOT_OWNED');
        if (report?.sourceType === 'template' && !hasOperationalReportSignatureAssignment(report, assignment, subjectId)) throw new Error('SIGNATURE_ASSIGNMENT_REQUIRED');
        await reportService.rejectReport(reportId, assignment.id, reason);
        await Promise.all([refreshReports(), refreshNotifications()]);
        showToast('Report rejected.', 'success');
        closeRejectReportModal();
        return;
      }
      if (authorityContextRef.current?.mode === 'delegated') throw new Error('REPORT_NOT_ACTIONABLE');
      await apiService.rejectReport(reportId, reason);
      await Promise.all([refreshReports(), refreshNotifications()]);
      showToast('Report rejected.', 'success');
      closeRejectReportModal();
    } catch (err: any) {
      throw await handleReportActionFailure(err, 'This report can no longer be rejected.', 'reject', actionAuthority);
    }
  };

  // Sign Report Action
  const signReport = async (reportId: string, payload: any = {}) => {
    if (operationalReportActionBlocked()) { showToast('Please wait for the current operational workspace to finish loading.', 'warning'); throw new Error('WORKSPACE_NOT_READY'); }
    if (!hasOperationalPermission('reports.sign')) { notifyOperationalActionBlocked(); throw new Error('FORBIDDEN'); }
    const actionAuthority = {
      delegated: authorityContextRef.current?.mode === 'delegated',
      delegationId: authorityContextRef.current?.mode === 'delegated' ? authorityContextRef.current.delegation?.delegationId ?? null : null,
    };
    try {
      if (!import.meta.env.DEV || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(reportId)) {
        const report = reports.find((r) => r.id === reportId);
        if (authorityContextRef.current?.mode === 'delegated' && (!report || report.sourceType !== 'template')) throw new Error('REPORT_NOT_ACTIONABLE');
        const assignment = reportAssignmentForAction(report);
        const subjectId = operationalSubjectForReportAction();
        if (!assignment) throw new Error('ASSIGNMENT_NOT_OWNED');
        if (!report || !hasOperationalReportSignatureAssignment(report, assignment, subjectId)) throw new Error('SIGNATURE_ASSIGNMENT_REQUIRED');
        await reportService.signReport(reportId, assignment.id, payload);
        // RPC responses are intentionally partial; hydrate from the authoritative detail query.
        try {
          const detail = await getReportDetail(reportId);
          setReports((previous) => previous.map((item) => item.id === reportId ? detail : item));
          setSelectedReportForView((previous) => previous?.id === reportId ? detail : previous);
        } catch {
          // The signing RPC is authoritative; the normal collection refresh below
          // remains the safe retry path for a transient detail-read failure.
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
      throw await handleReportActionFailure(err, 'This report can no longer be signed.', 'sign', actionAuthority);
    }
  };

  // Add Report Comment Action
  const addReportComment = async (reportId: string, message: string) => {
    // Report comments are not part of the delegated authoring contract supplied
    // for this phase; retain their actor-owned behavior.
    if (isDelegatedMode || workspaceLoadingRef.current || authorityContextStatus !== 'ready') {
      showToast('Report comments are available in your own authority context.', 'warning');
      return;
    }
    try {
      if (!import.meta.env.DEV || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(reportId)) await reportService.addReportComment(reportId, message);
      else await apiService.addReportComment(reportId, message);
      await Promise.all([refreshReports(), refreshNotifications()]);
      showToast('Comment posted', 'info');
    } catch (err: any) {
      showToast(normalizeError(err).message, 'warning');
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
    const actorId = currentUser.id;
    const subjectId = operationalSubjectUserId;
    return pendingTemplateApprovals.filter((template) =>
      template.createdById !== actorId
      && (!subjectId || belongsToOperationalSubject(template, subjectId) === false)
    );
  };

  const getMyRequestsForUser = () => {
    if (authorityContextStatus !== 'ready' || !operationalSubjectUserId) return [];
    // Supabase's RLS-scoped owned collection already reflects the selected
    // operational subject. Do not re-filter it by created_by_user_id here.
    if (isSupabasePrincipal(currentUser)) return myTemplates;
    return myTemplates.filter((t) => belongsToOperationalSubject(t, operationalSubjectUserId));
  };

  const getReportsAwaitingMyReview = () => {
    if (authorityContextStatus !== 'ready' || !operationalSubjectUserId) return [];
    return reports.filter(
      (r) => r.status === 'Sent' && isOperationalRecipient(r, operationalSubjectUserId)
    );
  };

  const hasPermission = (permission: PermissionKey) => hasPermissionKeys(currentUser.permissions, permission);
  const hasOperationalPermission = (permission: PermissionKey) => authorityContextStatus === 'ready'
    && Boolean(authorityContext)
    && !authorityContext?.staleSelection
    && hasEffectiveAuthorityPermission({
      mode: authorityContext?.mode ?? 'own',
      actorPermissions: currentUser.permissions,
      effectivePermissions: authorityContext?.authority.effectivePermissions,
    }, permission);
  const hasTemplateApprovalPermission = (permission: 'template_approvals.view' | 'template_approvals.approve' | 'template_approvals.reject' | 'template_approvals.comment') => {
    if (authorityContextStatus !== 'ready' || !authorityContext) return false;
    return hasEffectiveAuthorityPermission({
      mode: authorityContext?.mode ?? 'own',
      actorPermissions: currentUser.permissions,
      effectivePermissions: authorityContext?.authority.effectivePermissions,
    }, permission) && !authorityContext?.staleSelection;
  };
  const isDelegatedMode = authorityContextStatus === 'ready' && authorityContext?.mode === 'delegated' && !authorityContext.staleSelection;
  const operationalSubject = authorityContextStatus === 'ready' ? authorityContext?.operationalSubject ?? null : null;
  const operationalSubjectUserId = operationalSubject?.userId ?? null;
  const canOpenOperationalReadView = (view: 'reports' | 'templates' | 'my-requests') => {
    if (authorityContextStatus !== 'ready') return false;
    if (view === 'reports') return hasOperationalPermission('reports.create') || hasOperationalPermission('reports.view_own') || hasOperationalPermission('reports.view_received') || hasOperationalPermission('reports.view_organization');
    if (view === 'templates') return hasOperationalPermission('templates.view_approved') || hasOperationalPermission('templates.create') || hasOperationalPermission('templates.edit_own_draft');
    return hasOperationalPermission('templates.create') || hasOperationalPermission('templates.edit_own_draft');
  };

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
        reportEditLoadingId,
        activeView,
        insightsAccess,
        authorityContextStatus,
        authorityContext,
        operationalSubject,
        operationalSubjectUserId,
        isDelegatedMode,
        operationalWorkspaceLoading,
        operationalWorkspaceError,
        reportsLoading,
        reportsError,
        activityTimelineWasLoaded,
        markActivityTimelineLoaded,
        canOpenOperationalReadView,
        selectedCategory,
        searchTerm,
        sidebarOpen,
        toast,
        templatesLoading,
        templatesError,
        templateArchiveRevision,
        lastArchivedTemplateId,
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
        setActiveView: navigateToView,
        refreshInsightsAccess,
        refreshAuthorityContext,
        revalidateAuthorityContext,
        getReportDetail,
        selectDelegationContext,
        openDelegatedReportNotification,
        clearDelegationContext,
        hasTemplateApprovalPermission,
        refreshTemplateComments,
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
        archiveTemplate,
        claimTemplateReview,
        addRequestComment,
        createReportInstance,
        createUploadedReport,
        attachUploadedReportDocument,
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
        hasOperationalPermission,
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
