import React, { useMemo } from 'react';
import type { CrudViewComponents } from '@nubitio/crud';
import { CrudViewProvider } from '@nubitio/crud';

import { DevExtremeDataGridView } from './DevExtremeDataGridView';
import { DevExtremeFormView } from './DevExtremeFormView';
import { DevExtremeThemeSync, type DevExtremeThemeSyncProps } from './DevExtremeThemeSync';

export interface DevExtremeCrudProviderProps extends DevExtremeThemeSyncProps {
  children: React.ReactNode;
  /**
   * Swap only the views you need. Omitted views keep the native Nubit
   * implementations from @nubitio/crud.
   */
  views?: Partial<CrudViewComponents>;
  /** When false, skip loading dx.light/dx.dark CSS (you import a theme yourself). */
  syncTheme?: boolean;
}

const defaultDevExtremeViews: Partial<CrudViewComponents> = {
  DataGridView: DevExtremeDataGridView,
  FormView: DevExtremeFormView,
};

export function DevExtremeCrudProvider({
  children,
  views,
  basePath,
  syncTheme = true,
}: DevExtremeCrudProviderProps) {
  const mergedViews = useMemo(
    () => ({
      DataGridView: views?.DataGridView ?? defaultDevExtremeViews.DataGridView!,
      FormView: views?.FormView ?? defaultDevExtremeViews.FormView!,
    }),
    [views?.DataGridView, views?.FormView],
  );

  return (
    <CrudViewProvider views={mergedViews}>
      {syncTheme ? <DevExtremeThemeSync basePath={basePath} /> : null}
      {children}
    </CrudViewProvider>
  );
}