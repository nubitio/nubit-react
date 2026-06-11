import React from 'react';
import { Button, Drawer } from '@nubitio/ui';
import { useCoreTranslation } from '@nubitio/core';
import type { CrudFormShellProps } from './CrudFormShellProps';
import { DEFAULT_DRAWER_WIDTH } from './drawerSizes';

/**
 * Drawer form shell — slides in from the side and leaves the grid visible.
 *
 * Thin wrapper around the generic <Drawer> from @nubitio/ui that adds the
 * CRUD-specific footer (Cancel + Save buttons).
 */
export const CrudDrawerShell: React.FC<CrudFormShellProps> = ({
  isOpen,
  mode,
  title,
  onClose,
  onCancel,
  onSave,
  drawerWidth = DEFAULT_DRAWER_WIDTH,
  drawerSide = 'right',
  children,
}) => {
  const { t } = useCoreTranslation();

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width={drawerWidth}
      side={drawerSide}
      scrim="subtle"
      closeLabel={t('dialog.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t('dialog.buttonCancel')}
          </Button>
          {mode !== 'view' && (
            <Button variant="primary" className="nb-dialog-save-button" onClick={onSave}>
              {t('dialog.buttonSave')}
            </Button>
          )}
        </>
      }
    >
      {children}
    </Drawer>
  );
};
