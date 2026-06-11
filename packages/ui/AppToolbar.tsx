import React, { ReactNode } from 'react';
import { IconButton } from './Button';
import './AppToolbar.scss';

export interface AppToolbarProps {
  title: string;
  additionalToolbarContent?: ReactNode;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  icon?: string;
  refreshLabel?: string;
}

export const AppToolbar = ({
  title,
  additionalToolbarContent,
  showRefreshButton = true,
  onRefresh,
  icon,
  refreshLabel = 'Refresh',
  children,
}: AppToolbarProps & React.PropsWithChildren) => {
  return (
    <div className="view-wrapper view-wrapper-dashboard">
      <div className="nb-toolbar theme-dependent">
        <div className="nb-toolbar__start">
          {icon && <i className={icon} aria-hidden="true" />}
          <span className="toolbar-header">{title}</span>
        </div>
        <div className="nb-toolbar__center">
          {additionalToolbarContent}
        </div>
        <div className="nb-toolbar__end">
          {showRefreshButton && (
            <IconButton
              icon="ph ph-arrow-clockwise"
              label={refreshLabel}
              onClick={onRefresh}
            />
          )}
        </div>
      </div>
      {children}
    </div>
  );
};
