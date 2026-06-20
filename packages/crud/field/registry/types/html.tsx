import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import { defaultBuildFilterTerms, KEEP, TEXT_OPERATORS } from '../shared';
import { HtmlEditor } from './HtmlEditor';

function stripTags(html: unknown): string {
  if (html === null || html === undefined) return '';
  const str = String(html);
  if (!str.includes('<')) return str;
  // DOMParser does not execute scripts — safe for plain-text extraction.
  try {
    const doc = new DOMParser().parseFromString(str, 'text/html');
    return doc.body.textContent ?? '';
  } catch {
    return str.replace(/<[^>]*>/g, '');
  }
}

export const htmlTypeModule: FieldTypeModule = {
  defaultFilterOperator: 'contains',
  filterOperators: TEXT_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  // Plain text for grid tooltip and filter — strip tags without rendering them.
  cellText: (_field, value) => stripTags(value),
  serializeFormValue: () => KEEP,
  serializeDetailValue: () => KEEP,
  // Grid cell: render stored HTML visually. TipTap's schema limits what can be
  // stored here, so arbitrary script injection is prevented at write time.
  // A strict CSP (script-src 'self') is the defence-in-depth layer at read time.
  CellRender: ({ value }) => (
    <div
      className="nb-datagrid__html-cell"
      dangerouslySetInnerHTML={{ __html: String(value ?? '') }}
    />
  ),
  // Form: TipTap WYSIWYG editor — bold, italic, lists, links, headings.
  ControlRender: ({ field, value, commonProps, disabled, errorClass, setFieldValue }) => (
    <HtmlEditor
      id={commonProps.id}
      name={field.name}
      value={String(value ?? '')}
      disabled={disabled}
      readOnly={commonProps.readOnly}
      hasError={errorClass !== ''}
      onChange={(html) => setFieldValue(field.name, html)}
    />
  ),
};
