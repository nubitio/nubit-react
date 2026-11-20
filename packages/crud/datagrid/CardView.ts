import type { ReactNode } from 'react';
import type { DataRecord } from '@nubitio/core';

export interface CardViewContext {
  row: Readonly<DataRecord>;
  rowIndex: number;
  selected: boolean;
}

/** Native grid presentation: shares the table's query, selection, permissions and pager. */
export interface CardViewConfig {
  defaultView?: 'table' | 'cards';
  /** Compact cards reduce spacing and media height without changing actions or data. */
  density?: 'comfortable' | 'compact';
  /** Labels consecutive server-ordered rows on the current page; does not regroup or sort data. */
  groupBy?: (row: Readonly<DataRecord>) => { key: string; label: ReactNode };
  /** Promote an existing permitted row action; all other actions remain in the menu. */
  primaryActionKey?: string;
  /** Edge-to-edge media above the content. Keep imagery data-driven. */
  renderMedia?: (context: CardViewContext) => ReactNode;
  /** Read-only visual content. The grid owns the open button, selection and row actions. */
  renderContent?: (context: CardViewContext) => ReactNode;
}
