import React from 'react';
import { Button, IconButton } from '@nubitio/ui';
import { useCoreTranslation } from '@nubitio/core';
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
  subtitle,
  onClose,
  onCancel,
  onSave,
  saveLabel,
  footerContent,
  busy = false,
  children,
}) => {
  const { t } = useCoreTranslation();
  if (!isOpen) return null;

  return (
    <section className="nb-crud-page-shell" aria-label={title} aria-busy={busy}>
      <header className="nb-crud-page-shell__header">
        <IconButton
          className="nb-crud-page-shell__back"
          icon="ph ph-arrow-left"
          label={t('dialog.buttonCancel')}
          onClick={onClose}
          disabled={busy}
        />
        <div className="nb-crud-page-shell__heading">
          <h1 className="nb-crud-page-shell__title">{title}</h1>
          {subtitle && <p className="nb-crud-page-shell__subtitle">{subtitle}</p>}
        </div>
      </header>
      <div className="nb-crud-page-shell__body">{children}</div>
      <footer className="nb-crud-page-shell__footer">
        {footerContent && <div className="nb-crud-page-shell__footer-content">{footerContent}</div>}
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {t('dialog.buttonCancel')}
        </Button>
        {mode !== 'view' && (
          <Button
            variant="primary"
            className="nb-dialog-save-button"
            onClick={onSave}
            disabled={busy}
          >
            <span>{saveLabel ?? t('dialog.buttonSave')}</span>
          </Button>
        )}
      </footer>
    </section>
  );
};
