import React from 'react';
import { CrudDialogView } from '../dialog/CrudDialogView';
import type { CrudFormShellProps } from './CrudFormShellProps';

/**
 * Dialog form shell — preserves the legacy CRUD UX.
 * Thin wrapper around `CrudDialogView` so the orchestrator can stay shell-agnostic.
 */
export const CrudDialogShell: React.FC<CrudFormShellProps> = ({
  isOpen,
  mode,
  title,
  onClose,
  onCancel,
  onSave,
  saveLabel,
  width,
  height,
  events,
  children,
}) => (
  <CrudDialogView
    events={events}
    width={width}
    height={height}
    title={title}
    isOpen={isOpen}
    onClose={onClose}
    onCancel={onCancel}
    onSave={onSave}
    positiveText={saveLabel}
    saveVisible={mode !== 'view'}
  >
    {children}
  </CrudDialogView>
);
