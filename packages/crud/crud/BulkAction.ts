export interface BulkAction {
  key: string;
  label: string;
  icon?: string;
  confirmMessage?: string;
  onAction: (selectedIds: (string | number)[]) => void | Promise<void>;
}
