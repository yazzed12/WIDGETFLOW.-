/** Never initialize a persisted editor from a lightweight report-list row. */
export async function prepareReportForEditing<T extends { id: string; detailLoaded?: boolean }>(
  report: T,
  loadDetail: (id: string) => Promise<T>,
  isCurrent: () => boolean,
  persisted: boolean,
  canReuseDetail: (report: T) => boolean = (candidate) => Boolean(candidate.detailLoaded),
): Promise<T> {
  if (!persisted) return report;
  const detail = canReuseDetail(report) ? report : await loadDetail(report.id);
  if (!isCurrent()) throw new Error('WORKSPACE_CHANGED');
  if (!detail.detailLoaded) throw new Error('REPORT_DETAIL_REQUIRED');
  return detail;
}
