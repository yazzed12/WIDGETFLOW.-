interface OperationalOwnerRow {
  createdById?: string | null;
  /** Operational owner, distinct from the authenticated physical creator. */
  operationalSubjectUserId?: string | null;
}

interface OperationalReportRow extends OperationalOwnerRow {
  sentToId?: string | null;
  assignments?: Array<{ recipientUserId?: string | null }>;
}

export const operationalOwnerUserId = (row: OperationalOwnerRow): string | null =>
  row.operationalSubjectUserId === undefined
    ? row.createdById ?? null
    : row.operationalSubjectUserId;

export const belongsToOperationalSubject = <T extends OperationalOwnerRow>(row: T, subjectUserId: string): boolean =>
  Boolean(subjectUserId) && operationalOwnerUserId(row) === subjectUserId;

export const isOperationalRecipient = (report: OperationalReportRow, subjectUserId: string): boolean =>
  Boolean(subjectUserId) && (report.sentToId === subjectUserId || Boolean(report.assignments?.some((assignment) => assignment.recipientUserId === subjectUserId)));

export const isOperationallyRelevantReport = (report: OperationalReportRow, subjectUserId: string): boolean =>
  belongsToOperationalSubject(report, subjectUserId) || isOperationalRecipient(report, subjectUserId);
