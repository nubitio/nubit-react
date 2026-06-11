import React from 'react';
import { Button, IconButton } from '@nubit/ui';
import { useCoreTranslation } from '@nubit/core';
import type { CrudFormShellProps } from './CrudFormShellProps';
import './CrudPageShell.scss';

/**
 * Page form shell — renders inline (no portal) and is expected to replace the
 * grid view via the `wrapper--with-page` CSS hook set by `CrudPage`.
 *
 * URL deep-linking is already wired through `useRouting`; the shell itself
 * does not navigate — it just exposes Back/Cancel/Save callbacks that the
 * orchestrator maps to `navigate()` calls or close-dialog dispatches.
 */
export const CrudPageShell: React.FC<CrudFormShellProps> = ({
  isOpen,
  mode,
  title,
  onClose,
  onCancel,
  onSave,
  saveLabel,
  children,
}) => {
  const { t } = useCoreTranslation();
  if (!isOpen) return null;

  return (
    <section className="nb-crud-page-shell" aria-label={title}>
      <header className="nb-crud-page-shell__header">
        <IconButton
          className="nb-crud-page-shell__back"
          icon="ph ph-arrow-left"
          label={t('dialog.buttonCancel')}
          onClick={onClose}
        />
        <h1 className="nb-crud-page-shell__title">{title}</h1>
      </header>
      <div className="nb-crud-page-shell__body">{children}</div>
      <footer className="nb-crud-page-shell__footer">
        <Button variant="secondary" onClick={onCancel}>
          {t('dialog.buttonCancel')}
        </Button>
        {mode !== 'view' && (
          <Button variant="primary" className="nb-dialog-save-button" onClick={onSave}>
            <span>{saveLabel ?? t('dialog.buttonSave')}</span>
          </Button>
        )}
      </footer>
    </section>
  );
};
