import React, { createContext, useContext, useMemo } from 'react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

import { NativeDataGridView } from '../datagrid/NativeDataGridView';
import type { DataGridViewOptions } from '../datagrid/DataGridViewOptions';
import type { GridHandle } from '../datagrid/GridHandle';
import { NativeFormView } from '../form/NativeFormView';
import type { FormViewOptions } from '../form/FormViewOptions';
import type { FormHandle } from '../form/FormHandle';

export type CrudDataGridView = ForwardRefExoticComponent<
  DataGridViewOptions & RefAttributes<GridHandle>
>;

export type CrudFormView = ForwardRefExoticComponent<
  FormViewOptions & RefAttributes<FormHandle>
>;

export interface CrudViewComponents {
  DataGridView: CrudDataGridView;
  FormView: CrudFormView;
}

const defaultViews: CrudViewComponents = {
  DataGridView: NativeDataGridView,
  FormView: NativeFormView,
};

const CrudViewContext = createContext<CrudViewComponents>(defaultViews);

export interface CrudViewProviderProps {
  children: React.ReactNode;
  /** Partial override — omitted views keep the native implementations. */
  views?: Partial<CrudViewComponents>;
}

export function CrudViewProvider({ children, views }: CrudViewProviderProps) {
  const value = useMemo(
    () => ({
      DataGridView: views?.DataGridView ?? defaultViews.DataGridView,
      FormView: views?.FormView ?? defaultViews.FormView,
    }),
    [views?.DataGridView, views?.FormView],
  );

  return <CrudViewContext.Provider value={value}>{children}</CrudViewContext.Provider>;
}

export function useCrudViews(): CrudViewComponents {
  return useContext(CrudViewContext);
}