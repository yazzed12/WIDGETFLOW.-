import type { LucideIcon } from 'lucide-react';
import { Clock, FileSpreadsheet, FileText, Plus, StickyNote } from 'lucide-react';
import type { PermissionKey } from '../../shared/permissionCatalog';
import { canAuthorTemplate } from '../../features/delegations/effectiveAuthority';

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  visible: boolean;
  badge?: string;
}

interface DashboardQuickActionInputs {
  hasOperationalPermission: (permission: PermissionKey) => boolean;
  hasTemplateApprovalPermission: (permission: 'template_approvals.view') => boolean;
  isDelegatedMode: boolean;
  myRequestsCount: number;
  pendingApprovalsCount: number;
  onCreateTemplate: () => void;
  onCreateReport: () => void;
  onMyRequests: () => void;
  onApprovals: () => void;
  onStickyNotes: () => void;
}

/** The Dashboard's existing shortcuts and visibility rules, shared by the rendered UI and its runtime test. */
export function buildDashboardQuickActions(input: DashboardQuickActionInputs): QuickAction[] {
  return [
    {
      id: 'create-template',
      title: 'Create New Template',
      description: 'Start a template in the existing builder.',
      icon: Plus,
      onClick: input.onCreateTemplate,
      visible: canAuthorTemplate(input.hasOperationalPermission),
    },
    {
      id: 'create-report',
      title: 'Create Report',
      description: 'Choose an approved template and fill a report.',
      icon: FileSpreadsheet,
      onClick: input.onCreateReport,
      visible: input.hasOperationalPermission('reports.create'),
    },
    {
      id: 'my-requests',
      title: 'My Requests',
      description: 'Track templates submitted for approval.',
      icon: FileText,
      onClick: input.onMyRequests,
      visible: input.hasOperationalPermission('templates.create') || input.hasOperationalPermission('templates.edit_own_draft'),
      badge: input.myRequestsCount > 0 ? `${input.myRequestsCount} pending` : undefined,
    },
    {
      id: 'approvals',
      title: 'Approvals',
      description: 'Open the template approval inbox.',
      icon: Clock,
      onClick: input.onApprovals,
      visible: input.hasTemplateApprovalPermission('template_approvals.view'),
      badge: input.pendingApprovalsCount > 0 ? `${input.pendingApprovalsCount} pending` : undefined,
    },
    {
      id: 'sticky-notes',
      title: 'Sticky Notes',
      description: 'Capture a quick personal note.',
      icon: StickyNote,
      onClick: input.onStickyNotes,
      visible: !input.isDelegatedMode,
    },
  ];
}
