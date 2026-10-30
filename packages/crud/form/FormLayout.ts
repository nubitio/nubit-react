export interface FormTab {
  label: string;
  fields: string[];
  icon?: string;
}

export interface FormSection {
  label: string;
  description?: string;
  /** Reactive, read-only supplementary content (e.g. a calculated summary). */
  renderAfter?: (data: Readonly<FormDataSnapshot>) => ReactNode;
  fields: string[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** When true (default), trailing half-column orphans expand to full width. */
  avoidOrphanFields?: boolean;
}

export type FormLayout =
  | { type: 'tabs'; tabs: FormTab[] }
  | { type: 'sections'; sections: FormSection[] }
  | {
      /** Native renderer: stacks by container width, not viewport width. */
      type: 'columns';
      main: FormSection[];
      aside: FormSection[];
    };
import type { ReactNode } from 'react';
import type { FormDataSnapshot } from './FormDataSnapshot';
