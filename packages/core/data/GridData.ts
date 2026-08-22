export interface GridData<T> {
  data: T[];
  totalCount: number;
  summary: T[] | null;
  /** Server-computed column aggregates (from X-Grid-Summary header). */
  gridSummary?: Record<string, unknown> | null;
  /**
   * True when `totalCount` is an estimate, or unknown.
   *
   * A resource that paginates by cursor gives up the exact count deliberately —
   * `COUNT(*)` is what stops scaling first. Rendering an estimate as if it were
   * exact is how a user reconciles against it and files a bug; the grid shows
   * "about N", or a page indicator, when this is set.
   */
  totalIsEstimate?: boolean;
  /**
   * The server's own link to the next page.
   *
   * Cursor pagination cannot be driven by a page number the client calculates:
   * each page is defined by the last row of the previous one. Following this is
   * the only correct way to advance.
   */
  nextPageUrl?: string | null;
}
