import React, { useEffect, useRef, useState } from 'react';
import { Button, IconButton } from '@nubitio/ui';
import type { CoreTranslationKeys } from '@nubitio/core';
import type { DataRecord } from '@nubitio/core';
import type { ResourceToolbarAction, ResourceToolbarItems } from '../crud/ResourceConfig';
import type { DataGridViewOptions } from './DataGridViewOptions';
import { normalizeIcon } from './gridFieldUtils';

export function getToolbarKey(action: ResourceToolbarAction, index: number): string {
  return action.key ?? action.text ?? String(index);
}

export function renderToolbarButton(action: ResourceToolbarAction, index: number, iconOnly = false) {
  if (action.visible === false) return null;
  const icon = normalizeIcon(action.icon);
  const variant =
    action.type === 'danger' ? 'danger' : action.type === 'primary' ? 'primary' : 'secondary';
  if (iconOnly) {
    return (
      <IconButton
        key={getToolbarKey(action, index)}
        className="nb-datagrid__toolbar-icon-action"
        icon={icon ? `ph ${icon}` : 'ph ph-circle'}
        label={action.hint ?? action.text ?? ''}
        onClick={action.onClick}
        disabled={action.disabled}
      />
    );
  }

  return (
    <Button
      key={getToolbarKey(action, index)}
      variant={variant}
      size="sm"
      icon={icon ? `ph ${icon}` : undefined}
      onClick={action.onClick}
      disabled={action.disabled}
      title={action.hint}
      aria-label={action.hint ?? action.text}
    >
      {action.text && <span>{action.text}</span>}
    </Button>
  );
}

export function isToolbarActionVisible(
  action: ResourceToolbarAction,
  permissions: string[],
): boolean {
  if (action.visible === false) return false;
  if (!action.permission) return true;
  return permissions.includes(action.permission);
}

export function renderSelectionActionItem(
  action: ResourceToolbarAction,
  index: number,
  disabled: boolean,
  onBeforeClick?: () => void,
) {
  const icon = normalizeIcon(action.icon);
  return (
    <button
      key={getToolbarKey(action, index)}
      type="button"
      className={`nb-datagrid__actions-item${action.type === 'danger' ? ' nb-datagrid__actions-item--danger' : ''}`}
      onClick={() => {
        onBeforeClick?.();
        action.onClick?.();
      }}
      disabled={disabled || action.disabled}
      role="menuitem"
    >
      {icon && <i className={`ph ${icon}`} aria-hidden="true" />}
      <span>{action.text}</span>
    </button>
  );
}

export function getResolvedRowActions(
  row: DataRecord,
  rowActions: DataGridViewOptions['rowActions'],
): ResourceToolbarAction[] {
  if (!rowActions) return [];
  return typeof rowActions === 'function' ? rowActions(row) : rowActions;
}

export function renderRowActionItem(
  action: ResourceToolbarAction,
  index: number,
  permissions: string[],
  onBeforeClick?: () => void,
) {
  if (!isToolbarActionVisible(action, permissions)) return null;
  return renderSelectionActionItem(action, index, false, onBeforeClick);
}

const DROPDOWN_OPENED_EVENT = 'lookup:opened';

export function SelectionActionsMenu({
  actionsLabel,
  selectedCount,
  actions = [],
  permissions,
}: {
  actionsLabel: string;
  selectedCount: number;
  actions?: ResourceToolbarAction[];
  permissions: string[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<symbol>(Symbol());

  const visibleActions = actions.filter((action) => isToolbarActionVisible(action, permissions));
  const disabled = selectedCount === 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    const id = idRef.current;
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ id: symbol }>).detail.id !== id) setOpen(false);
    };
    document.addEventListener(DROPDOWN_OPENED_EVENT, handler);
    return () => document.removeEventListener(DROPDOWN_OPENED_EVENT, handler);
  }, []);

  if (visibleActions.length === 0) return null;

  const dangerActions = visibleActions.filter((action) => action.type === 'danger');
  const regularActions = visibleActions.filter((action) => action.type !== 'danger');
  const groups = regularActions.reduce<Record<string, ResourceToolbarAction[]>>((acc, action) => {
    const group = action.group ?? 'default';
    acc[group] = acc[group] ?? [];
    acc[group].push(action);
    return acc;
  }, {});

  const label = selectedCount > 0 ? `${actionsLabel} (${selectedCount})` : actionsLabel;

  const handleToggle = () => {
    if (disabled) return;
    const next = !open;
    if (next) {
      document.dispatchEvent(
        new CustomEvent<{ id: symbol }>(DROPDOWN_OPENED_EVENT, { detail: { id: idRef.current } }),
      );
    }
    setOpen(next);
  };

  return (
    <div ref={containerRef} className="nb-datagrid__actions-menu">
      <Button
        variant="secondary"
        aria-disabled={disabled}
        aria-expanded={open}
        onClick={handleToggle}
      >
        <span>{label}</span>
        <i className="ph ph-caret-down" aria-hidden="true" />
      </Button>
      {open && !disabled && (
        <div className="nb-datagrid__actions-popover" role="menu">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="nb-datagrid__actions-group">
              {items.length > 1 && items[0]?.groupLabel && (
                <div className="nb-datagrid__actions-group-label">{items[0].groupLabel}</div>
              )}
              {items.map((action, index) =>
                renderSelectionActionItem(action, index, disabled, () => setOpen(false)),
              )}
            </div>
          ))}
          {dangerActions.length > 0 && (
            <div className="nb-datagrid__actions-danger-group">
              {dangerActions.map((action, index) =>
                renderSelectionActionItem(action, index, disabled, () => setOpen(false)),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function buildToolbar(
  options: DataGridViewOptions,
  t: (key: keyof CoreTranslationKeys, options?: DataRecord) => string,
  onAddClick: () => void,
  includeAddAction = true,
): ResourceToolbarItems {
  return {
    primary: [
      ...(options.allowAdd && includeAddAction
        ? [
            {
              text: t('grid.buttonNew'),
              icon: 'ph-plus',
              type: 'primary' as const,
              onClick: onAddClick,
              disabled: options.addDisabled,
            },
          ]
        : []),
      ...(options.toolbar?.primary ?? []),
    ],
    selection: options.toolbar?.selection,
    utility: options.toolbar?.utility,
    showRefresh: options.toolbar?.showRefresh ?? true,
  };
}