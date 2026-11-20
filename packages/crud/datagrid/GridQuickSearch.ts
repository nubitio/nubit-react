/** Search terms use OR across fields and combine with column filters using AND. */
export interface GridQuickSearchConfig {
  /** Backend field paths to search (the grid protocol's `searchExpr`). */
  searchExpr: readonly string[];
  /** Defaults to cards only; tables already have column filters. */
  showIn?: 'cards' | 'table' | 'both';
  /** Overrides the localized default prompt. */
  placeholder?: string;
}

export interface GridSearchQuery {
  searchExpr: readonly string[];
  searchValue: string;
}

export function resolveQuickSearch(
  config: GridQuickSearchConfig | false | undefined,
  showCards: boolean,
): GridQuickSearchConfig | undefined {
  if (!config || config.searchExpr.length === 0) return undefined;
  const mode = config.showIn ?? 'cards';
  return mode === 'both' || (mode === 'cards') === showCards ? config : undefined;
}

export function matchesQuickSearch(row: Record<string, unknown>, search: GridSearchQuery): boolean {
  const needle = search.searchValue.toLowerCase();
  return search.searchExpr.some((field) => {
    const value = field.split('.').reduce<unknown>((current, key) => {
      if (current === null || typeof current !== 'object' || !Object.hasOwn(current, key))
        return undefined;
      return (current as Record<string, unknown>)[key];
    }, row);
    return (
      (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
      String(value).toLowerCase().includes(needle)
    );
  });
}
