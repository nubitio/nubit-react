/**
 * Typed event name interfaces for core components.
 * Each field is optional — only declare the events your feature uses.
 */

export interface DataGridEventNames {
  ADD?: string;
  EDIT?: string;
  DELETE?: string;
  SUCCESS?: string;
  LOADING?: string;
  CANCEL?: string;
  EXPORT?: string;
}

export interface FormEventNames {
  ADD?: string;
  EDIT?: string;
  DELETE?: string;
  SAVE?: string;
  SUCCESS?: string;
  LOADING?: string;
  CANCEL?: string;
}

export interface DialogEventNames {
  ADD?: string;
  EDIT?: string;
  SAVE?: string;
  SUCCESS?: string;
  LOADING?: string;
  CANCEL?: string;
}

export interface ToolbarButtonItem {
  icon?: string;
  text: string;
  hint?: string;
  /** Semantic button type. Common values: 'default' | 'normal' | 'danger' | 'success' | 'back' */
  type?: string;
  onClick?: () => void;
  disabled?: boolean;
  visible?: boolean;
}
