export interface GridData<T> {
  data: T[];
  totalCount: number;
  summary: T[] | null;
  /** Server-computed column aggregates (from X-Grid-Summary header). */
  gridSummary?: Record<string, unknown> | null;
}
