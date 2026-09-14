import type { WidgetTemplate } from '../../../types';
import { templateRepository } from '../repositories/templateRepository';
export const templateService = {
  getTemplates: () => templateRepository.getTemplates(), getApprovedTemplates: () => templateRepository.getApprovedTemplates(),
  getCategories: () => templateRepository.getCategories(),
  getMyTemplates: () => templateRepository.getMyTemplates(), getPendingApprovals: () => templateRepository.getPendingApprovals(),
  getTemplateById: (id: string) => templateRepository.getTemplateById(id), getTemplateComments: (id: string) => templateRepository.getTemplateComments(id),
  saveDraft: (template: WidgetTemplate) => templateRepository.saveDraft(template), submit: (id: string) => templateRepository.submit(id),
  claimReview: (id: string) => templateRepository.claimReview(id), approve: (id: string) => templateRepository.approve(id),
  reject: (id: string, reason: string) => templateRepository.reject(id, reason),
  returnForRevision: (id: string, reason: string) => templateRepository.returnForRevision(id, reason),
  createRevision: (id: string) => templateRepository.createRevision(id),
  addComment: (id: string, message: string) => templateRepository.addComment(id, message),
};
