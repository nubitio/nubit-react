import React, { useEffect, useState } from 'react';
import { useCoreTranslation } from '@nubitio/core';
import type { IssuedDocument } from './useIssuedDocument';

export interface DocumentHistoryPanelProps {
  /** Loads the copies. Called each time the panel opens, never cached. */
  load: () => Promise<IssuedDocument[]>;
  visible: boolean;
}

/**
 * Every copy ever issued for one record, newest first.
 *
 * Superseded copies are shown rather than hidden, and that is the point: "which
 * version did the customer receive?" is a question the archive exists to answer,
 * and a list showing only the current copy could not.
 */
export function DocumentHistoryPanel({
  load,
  visible,
}: DocumentHistoryPanelProps): React.JSX.Element | null {
  const { t } = useCoreTranslation();
  const [documents, setDocuments] = useState<IssuedDocument[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDocuments(null);
      return;
    }

    let cancelled = false;

    load()
      .then((loaded) => {
        if (!cancelled) setDocuments(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [load, visible]);

  if (!visible) return null;

  if (failed) {
    return <p className="nb-document-history__error">{t('document.error')}</p>;
  }

  if (documents === null) {
    return <p className="nb-document-history__loading">{t('document.loading')}</p>;
  }

  if (documents.length === 0) {
    return <p className="nb-document-history__empty">{t('document.empty')}</p>;
  }

  return (
    <ul className="nb-document-history">
      {documents.map((document) => (
        <li
          key={document.id}
          className={
            document.supersededBy === null
              ? 'nb-document-history__item'
              : 'nb-document-history__item nb-document-history__item--superseded'
          }
        >
          <span className="nb-document-history__number">{document.number ?? document.id}</span>
          <time className="nb-document-history__date" dateTime={document.issuedAt}>
            {new Date(document.issuedAt).toLocaleString()}
          </time>
          {document.issuedBy !== null && (
            <span className="nb-document-history__author">{document.issuedBy}</span>
          )}
          {document.status === 'ready' ? (
            <a
              className="nb-document-history__link"
              href={document.downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('document.download')}
            </a>
          ) : (
            <span className="nb-document-history__status">{document.status}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
