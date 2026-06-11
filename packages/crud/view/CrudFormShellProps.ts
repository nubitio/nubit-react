import React from 'react';
import type { DialogEventNames } from '@nubit/core';
import type { DialogMode } from '../crud/dialogStore';

/**
 * Common API consumed by every CRUD form shell — Dialog, Drawer, Page.
 *
 * The shell is purely a presentational container around the `FormView` passed
 * in `children`. The orchestrator (`CrudPage`) owns the form lifecycle and
 * tells the shell only when to open/close.
 */
export interface CrudFormShellProps {
  /** Whether the form is currently being shown. */
  isOpen: boolean;

  /** add | edit | view — drives the title and (for some shells) intent UI. */
  mode: DialogMode;

  /** Localised title (already mapped from mode by the orchestrator). */
  title: string;

  /** Called when the user dismisses the shell (Escape, scrim, back nav). */
  onClose: () => void;

  /** Called when the user clicks the Cancel button. */
  onCancel: () => void;

  /** Called when the user clicks the Save button. */
  onSave: () => void;

  /** Override the default save button label. */
  saveLabel?: string;

  /** Dialog-only sizing. Drawer/Page shells ignore these. */
  width?: number;
  height?: number;

  /** Drawer-only sizing. */
  drawerWidth?: number | string;
  drawerSide?: 'right' | 'left';

  /**
   * Legacy event bus — passed through to keep the existing event-driven
   * close/loading behaviour working until consumers migrate to callbacks.
   */
  events?: DialogEventNames;

  /** The rendered `FormView`. */
  children: React.ReactNode;
}
