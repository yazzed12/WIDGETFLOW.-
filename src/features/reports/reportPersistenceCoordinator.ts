export type EnsureReportPayload = {
  templateId: string;
  data?: Record<string, unknown>;
  title?: string;
};

/**
 * Owns the one canonical Report instance used by an open Report editor.
 * Concurrent persistence requests share the same promise, so attachment
 * selection and an overlapping Save action cannot create duplicate Reports.
 */
export class ReportPersistenceCoordinator<TReport> {
  private current: TReport | null = null;
  private pending: Promise<TReport> | null = null;
  private generation = 0;
  private readonly create: (payload: EnsureReportPayload) => Promise<TReport>;

  constructor(
    create: (payload: EnsureReportPayload) => Promise<TReport>,
  ) {
    this.create = create;
  }

  seed(report: TReport | null): void {
    this.generation += 1;
    this.current = report;
    this.pending = null;
  }

  clear(): void {
    this.generation += 1;
    this.current = null;
    this.pending = null;
  }

  getCurrent(): TReport | null {
    return this.current;
  }

  async ensure(payload: EnsureReportPayload): Promise<TReport> {
    if (this.current) return this.current;
    if (this.pending) return this.pending;

    const generation = this.generation;
    const creation = this.create(payload)
      .then((report) => {
        if (this.generation === generation) {
          this.current = report;
        }
        return report;
      })
      .finally(() => {
        if (this.pending === creation) {
          this.pending = null;
        }
      });

    this.pending = creation;
    return creation;
  }
}
