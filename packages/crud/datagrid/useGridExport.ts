import { useCallback, useState } from 'react';
import type { Field } from '../field/Field';
import type { ResourceLoadOptions, ResourceStore } from '../data/ResourceStore';
import { buildFilterExpression } from './FilterRow';
import { downloadBlob } from './downloadBlob';

interface GridExportOptions {
  source: ResourceStore;
  fields: Field[];
  filters: Record<string, string>;
  filterOperators: Record<string, string>;
  sort: Array<{ selector: string; desc: boolean }>;
}

/** Downloads every row matching the grid's current filters/sort (not just the current page). */
export function useGridExport({ source, fields, filters, filterOperators, sort }: GridExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);

  const clearExportError = useCallback(() => setExportError(null), []);

  const runExport = useCallback(async () => {
    if (!source.export) return;

    setIsExporting(true);
    setExportError(null);
    const loadOptions: ResourceLoadOptions = {
      filter: buildFilterExpression(filters, filterOperators, fields),
      sort,
    };

    try {
      const { blob, filename } = await source.export(loadOptions);
      downloadBlob(blob, filename);
    } catch (error) {
      // The grid renders this through its own error row (`grid.exportError`);
      // the console line keeps the underlying cause, which that one-line
      // message deliberately doesn't expose, reachable while debugging.
      setExportError(error);
      console.error('Grid export failed', error);
    } finally {
      setIsExporting(false);
    }
  }, [fields, filterOperators, filters, sort, source]);

  return {
    isExporting,
    exportError,
    clearExportError,
    runExport,
    canExport: Boolean(source.export),
  };
}
