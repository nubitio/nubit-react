import type { SummaryItem } from '@nubitio/crud';
import type { HydraResourceSchema } from './types';

export function buildSummaryFieldsFromSchema(schema: HydraResourceSchema): SummaryItem[] {
  return schema.fields
    .filter((field) => field.crudHints?.summable)
    .map((field) => ({
      column: field.name,
      summaryType: field.crudHints?.summaryType ?? 'sum',
      valueFormat: field.crudHints?.format === 'currency' ? 'currency' : undefined,
      label: field['hydra:title'] && field['hydra:title'] !== field.name ? field['hydra:title'] : undefined,
    }));
}