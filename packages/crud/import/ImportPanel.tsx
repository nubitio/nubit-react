import React, { useState } from 'react';
import { useCoreTranslation } from '@nubitio/core';
import { useSpreadsheetImport } from './useSpreadsheetImport';
import type { ImportReport } from './useSpreadsheetImport';

export interface ImportPanelProps {
  /** `uploadUrl` from the resource's `x-importable`. */
  uploadUrl: string;
  /** Fired after a successful apply, so the grid can reload. */
  onApplied?: () => void;
}

/**
 * Upload, review, apply.
 *
 * The middle step is the feature. The summary and the row errors are shown
 * before anything is written, and the apply button stays disabled while any row
 * is invalid — because the server refuses a partial import, and a button that
 * looks available but always fails is worse than one that explains itself.
 */
export function ImportPanel({ uploadUrl, onApplied }: ImportPanelProps): React.JSX.Element {
  const { t } = useCoreTranslation();
  const { state, analyze, confirm, reset } = useSpreadsheetImport(uploadUrl);
  const [numberFormat, setNumberFormat] = useState('auto');

  function onFileChosen(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) void analyze(file, numberFormat);
  }

  async function onConfirm(): Promise<void> {
    await confirm();
    onApplied?.();
  }

  return (
    <section className="nb-import">
      <h2 className="nb-import__title">{t('import.title')}</h2>

      {(state.status === 'idle' || state.status === 'error') && (
        <div className="nb-import__upload">
          <label className="nb-import__format">
            {t('import.numberFormat')}
            <select value={numberFormat} onChange={(event) => setNumberFormat(event.target.value)}>
              <option value="auto">{t('import.numberFormatAuto')}</option>
              <option value="dot">{t('import.numberFormatDot')}</option>
              <option value="comma">{t('import.numberFormatComma')}</option>
            </select>
          </label>

          <label className="nb-import__file">
            {t('import.chooseFile')}
            <input type="file" accept=".csv,.xlsx,.xls" onChange={onFileChosen} />
          </label>

          {state.status === 'error' && (
            <p className="nb-import__error">
              {t('import.failed')}: {state.message}
            </p>
          )}
        </div>
      )}

      {state.status === 'analyzing' && <p className="nb-import__status">{t('import.analyzing')}</p>}
      {state.status === 'applying' && <p className="nb-import__status">{t('import.applying')}</p>}

      {(state.status === 'reviewing' || state.status === 'applied') && (
        <ImportSummary report={state.session.report} />
      )}

      {state.status === 'reviewing' && (
        <div className="nb-import__actions">
          <p className="nb-import__notice">
            {state.session.report.invalid > 0
              ? t('import.blockedByErrors')
              : t('import.nothingApplied')}
          </p>
          <button
            type="button"
            className="nb-btn nb-btn--primary"
            disabled={state.session.report.invalid > 0}
            onClick={() => void onConfirm()}
          >
            {t('import.confirm')}
          </button>
          <button type="button" className="nb-btn nb-btn--ghost" onClick={reset}>
            {t('import.chooseFile')}
          </button>
        </div>
      )}

      {state.status === 'applied' && <p className="nb-import__applied">{t('import.applied')}</p>}
    </section>
  );
}

function ImportSummary({ report }: { report: ImportReport }): React.JSX.Element {
  const { t } = useCoreTranslation();

  return (
    <div className="nb-import__summary">
      <p>
        {t('import.summary', {
          rows: report.rows,
          inserts: report.inserts,
          updates: report.updates,
          invalid: report.invalid,
        })}
      </p>

      {report.unmapped !== undefined && report.unmapped.length > 0 && (
        <p className="nb-import__unmapped">
          {t('import.unmapped', { fields: report.unmapped.join(', ') })}
        </p>
      )}

      {report.errors.length > 0 && (
        <>
          <h3 className="nb-import__errors-title">{t('import.errorsTitle')}</h3>
          <ul className="nb-import__errors">
            {report.errors.map((error, index) => (
              <li key={`${error.line}-${error.field}-${index}`} className="nb-import__error-row">
                <span className="nb-import__error-line">
                  {t('import.errorLine', { line: error.line })}
                </span>
                <span className="nb-import__error-field">{error.field}</span>
                <span className="nb-import__error-message">{error.message}</span>
              </li>
            ))}
          </ul>
          {report.truncatedErrors && (
            <p className="nb-import__errors-truncated">{report.errorCount}</p>
          )}
        </>
      )}
    </div>
  );
}
