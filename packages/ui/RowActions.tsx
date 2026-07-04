import { ContextMenu, type ContextMenuItem, type ContextMenuProps } from './ContextMenu';
import { useUiStrings } from './UiStrings';

export interface RowActionsProps {
  items: ContextMenuItem[];
  triggerLabel?: string;
  align?: ContextMenuProps['align'];
  className?: string;
}

/** Context menu preset for table row overflow actions. */
export function RowActions({
  items,
  triggerLabel,
  align = 'right',
  className,
}: RowActionsProps) {
  const strings = useUiStrings();

  if (items.length === 0) {
    return null;
  }

  return (
    <ContextMenu
      items={items}
      align={align}
      className={className}
      triggerLabel={triggerLabel ?? strings.rowActions}
      visible
    />
  );
}