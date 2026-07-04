declare module 'devextreme/data/custom_store' {
  export interface CustomStoreOptions {
    key?: string | string[];
    load?: (loadOptions: Record<string, unknown>) => Promise<unknown>;
    byKey?: (key: unknown) => Promise<unknown>;
    insert?: (values: Record<string, unknown>) => Promise<unknown>;
    update?: (key: unknown, values: Record<string, unknown>) => Promise<unknown>;
    remove?: (key: unknown) => Promise<void>;
  }

  export default class CustomStore {
    constructor(options: CustomStoreOptions);
  }
}

declare module 'devextreme-react/data-grid' {
  import type { ComponentType, ReactNode } from 'react';

  export interface DataGridProps {
    dataSource?: unknown;
    keyExpr?: string;
    showBorders?: boolean;
    columnAutoWidth?: boolean;
    remoteOperations?: boolean | Record<string, boolean>;
    height?: number | string;
    ref?: unknown;
    onSelectionChanged?: (event: {
      selectedRowsData?: Array<Record<string, unknown>>;
      selectedRowKeys?: unknown[];
    }) => void;
    onRowDblClick?: (event: { data?: Record<string, unknown> }) => void;
    onToolbarPreparing?: (event: {
      toolbarOptions?: { items?: Array<Record<string, unknown>> };
    }) => void;
    onSaving?: (event: {
      cancel?: boolean;
      changes?: Array<{ type?: string; data?: Record<string, unknown>; key?: unknown }>;
    }) => void;
    onEditCanceled?: () => void;
    onEditingChange?: () => void;
    onInitNewRow?: (event: { data?: Record<string, unknown> }) => void;
    onRowInserted?: (event: { data?: Record<string, unknown> }) => void;
    onRowRemoved?: (event: { data?: Record<string, unknown> }) => void;
    onRowRemoving?: (event: { cancel?: boolean; data?: Record<string, unknown> }) => void;
    onRowUpdated?: (event: { data?: Record<string, unknown> }) => void;
    children?: ReactNode;
  }

  const DataGrid: ComponentType<DataGridProps>;
  export default DataGrid;

  export const Column: ComponentType<Record<string, unknown>>;
  export const Paging: ComponentType<Record<string, unknown>>;
  export const Pager: ComponentType<Record<string, unknown>>;
  export const Selection: ComponentType<Record<string, unknown>>;
  export const Sorting: ComponentType<Record<string, unknown>>;
  export const FilterRow: ComponentType<Record<string, unknown>>;
  export const HeaderFilter: ComponentType<Record<string, unknown>>;
  export const Toolbar: ComponentType<Record<string, unknown>>;
  export const Item: ComponentType<Record<string, unknown>>;
  export const Editing: ComponentType<Record<string, unknown>>;
  export const RemoteOperations: ComponentType<Record<string, unknown>>;
  export const MasterDetail: ComponentType<{
    enabled?: boolean;
    render?: (detailInfo: { data?: Record<string, unknown> }) => ReactNode;
  }>;
  export const LoadPanel: ComponentType<{ enabled?: boolean; showPane?: boolean; shading?: boolean }>;
}

declare module 'devextreme-react/form' {
  import type { ComponentType } from 'react';

  export interface FormProps {
    className?: string;
    formData?: Record<string, unknown>;
    colCount?: number;
    labelLocation?: 'left' | 'top';
    readOnly?: boolean;
    onFieldDataChanged?: (event: { dataField?: string; value?: unknown }) => void;
    children?: unknown;
  }

  const Form: ComponentType<FormProps>;
  export default Form;

  export const SimpleItem: ComponentType<Record<string, unknown>>;
  export const GroupItem: ComponentType<Record<string, unknown>>;
}