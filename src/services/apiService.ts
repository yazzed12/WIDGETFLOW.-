import type {
  WidgetTemplate,
  ReportInstance,
  Notification,
  RequestComment,
  ReportComment,
} from '../types';
import { httpRequest } from './httpClient';

export type AssetGatewayUploadPayload = {
  filename?: string;
  mimeType?: string;
  base64Data: string;
  purpose?: string;
  linkedReportId?: string;
};

export function buildAssetGatewayUploadBody(
  payload: AssetGatewayUploadPayload,
): AssetGatewayUploadPayload {
  return { ...payload };
}

export { ApiError } from './httpClient';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return httpRequest<T>(endpoint, {
    ...options,
    headers: new Headers(options.headers),
  });
}

export const apiService = {
  // Templates
  async getTemplates(params?: { status?: string; categoryId?: string; search?: string }): Promise<WidgetTemplate[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<WidgetTemplate[]>(`/api/templates${queryString}`);
  },

  async getTemplateById(id: string): Promise<WidgetTemplate> {
    return request<WidgetTemplate>(`/api/templates/${id}`);
  },

  async getPendingApprovals(): Promise<WidgetTemplate[]> {
    return request<WidgetTemplate[]>('/api/template-approvals');
  },

  async saveTemplateDraft(payload: any): Promise<WidgetTemplate> {
    return request<WidgetTemplate>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async submitTemplate(templateId: string, payload?: any): Promise<WidgetTemplate> {
    return request<WidgetTemplate>(`/api/templates/${templateId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  async claimTemplateReview(templateId: string): Promise<WidgetTemplate> {
    return request<WidgetTemplate>(`/api/templates/${templateId}/claim`, {
      method: 'POST',
    });
  },

  async approveTemplate(templateId: string): Promise<WidgetTemplate> {
    return request<WidgetTemplate>(`/api/templates/${templateId}/approve`, {
      method: 'POST',
    });
  },

  async rejectTemplate(templateId: string, reason: string): Promise<WidgetTemplate> {
    return request<WidgetTemplate>(`/api/templates/${templateId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getTemplateComments(templateId: string): Promise<RequestComment[]> {
    return request<RequestComment[]>(`/api/templates/${templateId}/comments`);
  },

  async addTemplateComment(templateId: string, message: string): Promise<RequestComment[]> {
    return request<RequestComment[]>(`/api/templates/${templateId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  async createTemplateVersion(templateId: string): Promise<WidgetTemplate> {
    return request<WidgetTemplate>(`/api/templates/${templateId}/version`, {
      method: 'POST',
    });
  },

  // Reports
  async getReports(params?: { mine?: boolean; received?: boolean; status?: string }): Promise<ReportInstance[]> {
    const query = new URLSearchParams();
    if (params?.mine) query.append('mine', 'true');
    if (params?.received) query.append('received', 'true');
    if (params?.status) query.append('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<ReportInstance[]>(`/api/reports${queryString}`);
  },

  async getReportById(id: string): Promise<ReportInstance> {
    return request<ReportInstance>(`/api/reports/${id}`);
  },

  async createReport(templateId: string, data?: Record<string, any>, title?: string): Promise<ReportInstance> {
    return request<ReportInstance>('/api/reports', {
      method: 'POST',
      body: JSON.stringify({ templateId, data, title }),
    });
  },

  async updateReport(reportId: string, data: Record<string, string | number>, title?: string): Promise<ReportInstance> {
    return request<ReportInstance>(`/api/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify({ data, title }),
    });
  },

  async markReportCompleted(reportId: string, data: Record<string, string | number>, title?: string): Promise<ReportInstance> {
    return request<ReportInstance>(`/api/reports/${reportId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ data, title }),
    });
  },

  async sendReport(reportId: string, recipientUserId: string, senderNote?: string, signaturePayload?: any): Promise<ReportInstance> {
    return request<ReportInstance>(`/api/reports/${reportId}/send`, {
      method: 'POST',
      body: JSON.stringify({ recipientUserId, senderNote, signaturePayload }),
    });
  },

  async returnReport(reportId: string, reason: string): Promise<ReportInstance> {
    return request<ReportInstance>(`/api/reports/${reportId}/return`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async rejectReport(reportId: string, reason: string): Promise<ReportInstance> {
    return request<ReportInstance>(`/api/reports/${reportId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async signReport(reportId: string, payload: any = {}): Promise<ReportInstance> {
    return request<ReportInstance>(`/api/reports/${reportId}/sign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getUserSignatureProfile(): Promise<any> {
    return request<any>('/api/user/signature-profile');
  },

  async saveUserSignatureProfile(payload: { method: 'uploaded' | 'drawn' | 'typed'; assetReference?: string; drawingReference?: string; typedName?: string }): Promise<any> {
    return request<any>('/api/user/signature-profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getReportComments(reportId: string): Promise<ReportComment[]> {
    return request<ReportComment[]>(`/api/reports/${reportId}/comments`);
  },

  async addReportComment(reportId: string, message: string): Promise<ReportComment[]> {
    return request<ReportComment[]>(`/api/reports/${reportId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return request<Notification[]>('/api/notifications');
  },

  async markNotificationRead(id: string): Promise<Notification[]> {
    return request<Notification[]>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead(): Promise<Notification[]> {
    return request<Notification[]>('/api/notifications/read-all', {
      method: 'POST',
    });
  },

  // Assets Upload
  async uploadAsset(payload: AssetGatewayUploadPayload): Promise<{ id: string; url: string; filename?: string; mimeType?: string }> {
    const body = buildAssetGatewayUploadBody(payload);
    const { data, error } = await (await import('../lib/supabase/client')).getSupabaseBrowserClient().functions.invoke('asset-gateway', { body });
    if (error) throw error;
    return ((data as any)?.data ?? data) as any;
  },

  async linkReportAsset(assetId: string, reportId: string): Promise<void> {
    const { data, error } = await (await import('../lib/supabase/client')).getSupabaseBrowserClient().functions.invoke('asset-gateway', { body: { action: 'link-report-asset', assetId, reportId } });
    if (error) throw error;
    if ((data as any)?.success === false) throw new Error((data as any)?.error?.message || 'Attachment linking failed.');
  },

  async uploadTemplateAsset(payload: { filename?: string; mimeType?: string; base64Data: string; linkedTemplateId?: string }): Promise<{ id: string; url: string; filename?: string; mimeType?: string }> {
    const { data, error } = await (await import('../lib/supabase/client')).getSupabaseBrowserClient().functions.invoke('asset-gateway', { body: { ...payload, purpose: 'template_asset' } });
    if (error) throw error;
    return ((data as any)?.data ?? data) as any;
  },

  async analyzeTemplateImport(formData: FormData): Promise<any> {
    return httpRequest<any>('/api/template-import/analyze', { method: 'POST', body: formData });
  },

  async uploadSignatureAsset(payload: { filename?: string; mimeType?: string; base64Data: string; attestationAccepted: boolean }): Promise<{ id: string; url: string }> {
    return request<{ id: string; url: string }>('/api/assets/signature-upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

};
