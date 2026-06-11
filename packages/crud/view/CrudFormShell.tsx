import React from 'react';
import { CrudDialogShell } from './CrudDialogShell';
import { CrudDrawerShell } from './CrudDrawerShell';
import { CrudPageShell } from './CrudPageShell';
import type { CrudFormShellProps } from './CrudFormShellProps';
import type { ResolvedViewMode } from './viewMode';

interface CrudFormShellPropsWithMode extends CrudFormShellProps {
  viewMode: ResolvedViewMode;
}

/**
 * Dispatches the form rendering to the correct shell based on the resource's
 * `viewMode`. All three shells consume the same `CrudFormShellProps`, so the
 * orchestrator (`CrudPage`) never has to know which shell is active.
 */
export const CrudFormShell: React.FC<CrudFormShellPropsWithMode> = ({
  viewMode,
  ...shellProps
}) => {
  switch (viewMode.mode) {
    case 'drawer':
      return (
        <CrudDrawerShell
          {...shellProps}
          drawerWidth={viewMode.drawerWidth}
          drawerSide={viewMode.drawerSide}
        />
      );
    case 'page':
      return <CrudPageShell {...shellProps} />;
    case 'dialog':
    default:
      return <CrudDialogShell {...shellProps} />;
  }
};
