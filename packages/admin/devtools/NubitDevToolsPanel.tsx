import React, { useState } from 'react';
import { isDevEnvironment, useDevTools } from '@nubitio/crud';
import './NubitDevToolsPanel.scss';

const PROVIDER_TREE = [
  'MercureProvider',
  'SchemaProvider',
  'HydraResourceSchemaProvider',
  'HydraResourceStoreProvider',
  'SmartCrudRolesProvider',
  'CoreProvider',
];

export function NubitDevToolsPanel() {
  const { enabled, resources, clearResources } = useDevTools();
  const [open, setOpen] = useState(false);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  if (!enabled || !isDevEnvironment()) return null;

  const active = expandedUrl ? resources.find((r) => r.apiUrl === expandedUrl) : resources[0];

  return (
    <div className={`nb-devtools ${open ? 'nb-devtools--open' : ''}`}>
      <button
        type="button"
        className="nb-devtools__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Nubit DevTools"
      >
        Nubit
      </button>

      {open && (
        <div className="nb-devtools__panel" role="complementary" aria-label="Nubit DevTools">
          <header className="nb-devtools__header">
            <strong>Nubit DevTools</strong>
            <button type="button" className="nb-devtools__clear" onClick={clearResources}>
              Clear
            </button>
          </header>

          <section className="nb-devtools__section">
            <h4>Provider tree</h4>
            <ul className="nb-devtools__providers">
              {PROVIDER_TREE.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </section>

          <section className="nb-devtools__section">
            <h4>Active resources ({resources.length})</h4>
            {resources.length === 0 ? (
              <p className="nb-devtools__empty">Open a SchemaCrudPage to inspect field resolution.</p>
            ) : (
              <>
                <select
                  className="nb-devtools__select"
                  value={active?.apiUrl ?? ''}
                  onChange={(e) => setExpandedUrl(e.target.value)}
                >
                  {resources.map((r) => (
                    <option key={r.apiUrl} value={r.apiUrl}>
                      {r.apiUrl}
                    </option>
                  ))}
                </select>

                {active && (
                  <dl className="nb-devtools__meta">
                    <dt>Source</dt>
                    <dd>{active.source}</dd>
                    <dt>Operations</dt>
                    <dd>{active.supportedOperations.join(', ') || '—'}</dd>
                    <dt>Permissions</dt>
                    <dd>{active.permissionsSource ?? '—'}</dd>
                  </dl>
                )}

                {active?.formDetail && (
                  <>
                    <h4 className="nb-devtools__subsection">Form detail (lines)</h4>
                    <dl className="nb-devtools__meta">
                      <dt>Line fields</dt>
                      <dd>{active.formDetail.fieldSource}</dd>
                      <dt>Property</dt>
                      <dd>{active.formDetail.propertyName ?? '—'}</dd>
                      <dt>Reload URL</dt>
                      <dd className="nb-devtools__mapping">{active.formDetail.reloadUrl ?? '—'}</dd>
                      <dt>Line class</dt>
                      <dd>{active.formDetail.lineClass ?? '—'}</dd>
                      <dt>x-embedded-lines</dt>
                      <dd>{active.formDetail.embeddedLinesCount}</dd>
                    </dl>
                  </>
                )}

                {active && (
                  <>
                    <h4 className="nb-devtools__subsection">Grid fields</h4>
                    <table className="nb-devtools__table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Type</th>
                          <th>Mapping</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.fields
                          .filter((f) => !f.isIdentity)
                          .map((f) => (
                            <tr key={f.name}>
                              <td>{f.name}</td>
                              <td>{f.type}</td>
                              <td className="nb-devtools__mapping">{f.mappingReason ?? '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </>
                )}

                {active?.formDetail && active.formDetail.lineFieldCount > 0 && (
                  <>
                    <h4 className="nb-devtools__subsection">Line fields ({active.formDetail.lineFieldCount})</h4>
                    <table className="nb-devtools__table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Type</th>
                          <th>Mapping</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.formDetail.lineFields
                          .filter((f) => !f.isIdentity)
                          .map((f) => (
                            <tr key={f.name}>
                              <td>{f.name}</td>
                              <td>{f.type}</td>
                              <td className="nb-devtools__mapping">{f.mappingReason ?? '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </section>

          <footer className="nb-devtools__footer">
            <a href="https://github.com/nubitio/nubit-react/blob/main/docs/architecture/README.md" target="_blank" rel="noreferrer">
              Architecture docs
            </a>
          </footer>
        </div>
      )}
    </div>
  );
}