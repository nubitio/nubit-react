import { useLayoutEffect, useState, type RefObject } from 'react';
import type { DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import { getCellText } from './cellRendering';
import { computeAutoColumnWidths } from './gridLayoutUtils';

interface AutoColumnWidthsOptions {
  theadRef: RefObject<HTMLTableSectionElement | null>;
  tbodyRef: RefObject<HTMLTableSectionElement | null>;
  fields: Field[];
  rows: DataRecord[];
  remoteOptions: Record<string, DataRecord[]>;
  yesLabel: string;
  noLabel: string;
}

function sameWidths(left: Record<string, number>, right: Record<string, number>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && rightKeys.every((key) => left[key] === right[key]);
}

/** Measures rendered cells using the active theme fonts and returns content-driven widths. */
export function useAutoColumnWidths({
  theadRef,
  tbodyRef,
  fields,
  rows,
  remoteOptions,
  yesLabel,
  noLabel,
}: AutoColumnWidthsOptions): Record<string, number> {
  const [widths, setWidths] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    const update = (next: Record<string, number>) =>
      setWidths((current) => (sameWidths(current, next) ? current : next));

    if (rows.length === 0 || fields.length === 0) {
      update({});
      return;
    }

    const headerCell = theadRef.current?.querySelector('th');
    const bodyCell = tbodyRef.current?.querySelector('td');
    if (!headerCell || !bodyCell) return;

    const headerStyle = getComputedStyle(headerCell);
    const bodyStyle = getComputedStyle(bodyCell);
    update(
      computeAutoColumnWidths({
        fields,
        rows,
        headerFont: `${headerStyle.fontWeight} ${headerStyle.fontSize} ${headerStyle.fontFamily}`,
        bodyFont: `${bodyStyle.fontWeight} ${bodyStyle.fontSize} ${bodyStyle.fontFamily}`,
        getCellText: (field, row) =>
          getCellText(field, row, remoteOptions[field.name], yesLabel, noLabel),
      }),
    );
  }, [fields, noLabel, remoteOptions, rows, tbodyRef, theadRef, yesLabel]);

  return widths;
}
