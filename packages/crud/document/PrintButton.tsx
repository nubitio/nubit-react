import React, { useState } from 'react';
import { useCoreTranslation } from '@nubitio/core';
import { DocumentHistoryPanel } from './DocumentHistoryPanel';
import { useIssuedDocument } from './useIssuedDocument';

export interface PrintButtonProps {
  /** `issueUrl` from the resource's `x-printable`, with `{id}` still in it. */
  issueUrl: string;
  recordId: string | number;
  /** From `x-printable`. False hides the correction action entirely. */
  allowReissue?: boolean;
  /** Translation key or literal from `x-printable.title`. */
  title?: string;
}

/**
 * Issues a record's document and opens it.
 *
 * Two actions, never one control with a modifier. Printing is routine;
 * issuing a correction supersedes a document somebody may already be holding,
 * and it asks first. Collapsing them into one button is how corrections get
 * emitted by accident.
 */
export function PrintButton({
  issueUrl,
  recordId,
  allowReissue = true,
  title = 'document.print',
}: PrintButtonProps): React.JSX.Element {
  const { t } = useCoreTranslation();
  const { state, issue, reissue, history } = useIssuedDocument(issueUrl, recordId);
  const [historyOpen, setHistoryOpen] = useState(false);

  const label = title.includes('.') ? t(title as 'document.print') : title;

  async function open(action: typeof issue): Promise<void> {
    const document = await action();

    // Opened only once the bytes exist. A window opened optimistically onto a
    // pending document shows the browser's own error page, which tells the user
    // nothing about what actually happened.
    if (document !== null && document.status === 'ready' && typeof window !== 'undefined') {
      window.open(document.downloadUrl, '_blank', 'noopener');
    }
  }

  function confirmReissue(): void {
    if (typeof window !== 'undefined' && !window.confirm(t('document.reissueConfirm'))) return;
    void open(reissue);
  }

  return (
    <div className="nb-document-actions">
      <button
        type="button"
        className="nb-btn nb-btn--secondary"
        disabled={state.status === 'working'}
        onClick={() => void open(issue)}
      >
        {label}
      </button>

      {allowReissue && (
        <button
          type="button"
          className="nb-btn nb-btn--ghost"
          disabled={state.status === 'working'}
          onClick={confirmReissue}
        >
          {t('document.reissue')}
        </button>
      )}

      <button
        type="button"
        className="nb-btn nb-btn--ghost"
        onClick={() => setHistoryOpen((open) => !open)}
      >
        {t('document.history')}
      </button>

      {state.status === 'pending' && (
        <span className="nb-document-actions__status">{t('document.pending')}</span>
      )}
      {state.status === 'error' && (
        <span className="nb-document-actions__error">
          {t('document.failed')}: {state.message}
        </span>
      )}

      <DocumentHistoryPanel load={history} visible={historyOpen} />
    </div>
  );
}
