const requestCounts = new Map<string, number>();

/** Development-only timing/count diagnostics. Deliberately accepts no row or identity payload. */
export async function measureDev<T>(name: string, operation: () => Promise<T>): Promise<T> {
  if (!import.meta.env?.DEV) return operation();

  const count = (requestCounts.get(name) ?? 0) + 1;
  requestCounts.set(name, count);
  const startedAt = performance.now();
  try {
    const result = await operation();
    console.info('[WidgetFlow perf]', { name, requestCount: count, durationMs: Math.round(performance.now() - startedAt), outcome: 'ok' });
    return result;
  } catch (error) {
    const candidate = error as { code?: unknown; status?: unknown; statusCode?: unknown } | null;
    console.info('[WidgetFlow perf]', {
      name,
      requestCount: count,
      durationMs: Math.round(performance.now() - startedAt),
      outcome: 'error',
      errorCode: typeof candidate?.code === 'string' ? candidate.code : undefined,
      status: Number(candidate?.status ?? candidate?.statusCode) || undefined,
    });
    throw error;
  }
}

export function resetDevPerformanceCounts(): void {
  if (import.meta.env?.DEV) requestCounts.clear();
}

export function countDev(name: string): void {
  if (!import.meta.env?.DEV) return;
  const requestCount = (requestCounts.get(name) ?? 0) + 1;
  requestCounts.set(name, requestCount);
  console.info('[WidgetFlow perf]', { name, requestCount });
}
