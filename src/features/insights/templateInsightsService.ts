import { templateInsightsRepository } from './templateInsightsRepository';

export const templateInsightsService = {
  getTemplateUsageInsights: templateInsightsRepository.getTemplateUsageInsights,
  getTemplateUsageInsightDetail: templateInsightsRepository.getTemplateUsageInsightDetail,
  getTemplateUsagePeriodSummary: templateInsightsRepository.getTemplateUsagePeriodSummary,
  getTemplateControlStates: templateInsightsRepository.getTemplateControlStates,
  pauseTemplate: templateInsightsRepository.pauseTemplate,
  resumeTemplate: templateInsightsRepository.resumeTemplate,
  createTemplateRevision: templateInsightsRepository.createTemplateRevision,
  deleteTemplate: templateInsightsRepository.deleteTemplate,
};
