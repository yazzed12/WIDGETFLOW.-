import React from 'react';
import type { WidgetTemplate } from '../../../types';
import { templateService } from '../services/templateService';
import { buildTemplateReviewPackage, getTemplateReviewBaselineId, isCanonicalApprovedBaseline } from './templateReviewPackage';

export function useTemplateReviewPackage(current: WidgetTemplate, categoryNames: Record<string, string>) {
  const baselineId = getTemplateReviewBaselineId(current);
  const [resolution, setResolution] = React.useState<{
    id: string;
    baseline: WidgetTemplate | null;
    loading: boolean;
    unavailable: boolean;
  } | null>(null);

  React.useEffect(() => {
    let active = true;
    if (!baselineId) {
      return;
    }

    void templateService.getTemplateById(baselineId)
      .then((resolved) => {
        if (!active) return;
        const isAvailable = isCanonicalApprovedBaseline(resolved);
        setResolution({ id: baselineId, baseline: isAvailable ? resolved : null, loading: false, unavailable: !isAvailable });
      })
      .catch(() => { if (active) setResolution({ id: baselineId, baseline: null, loading: false, unavailable: true }); });
    return () => { active = false; };
  }, [baselineId]);

  const hasResolvedCurrentLineage = Boolean(baselineId && resolution?.id === baselineId);
  const baseline = hasResolvedCurrentLineage ? resolution?.baseline ?? null : null;
  const loading = Boolean(baselineId && (!hasResolvedCurrentLineage || resolution?.loading));
  const baselineUnavailable = Boolean(baselineId && hasResolvedCurrentLineage && resolution?.unavailable);

  const reviewPackage = React.useMemo(
    () => buildTemplateReviewPackage(current, baseline, categoryNames),
    [current, baseline, categoryNames],
  );

  return { reviewPackage, loading, baselineUnavailable: baselineUnavailable || Boolean(baselineId && !baseline && !loading) };
}
