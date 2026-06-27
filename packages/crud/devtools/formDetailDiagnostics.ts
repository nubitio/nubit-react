import type { ResourceFormDetail } from '../crud/ResourceConfig';
import type { Field } from '../field/Field';

export type FormDetailFieldSource = 'inferred' | 'manual' | 'none' | 'opt-out';

export interface EmbeddedLinesBindingSummary {
  propertyName: string;
  lineClass: string;
  reloadUrl: string;
}

export interface FormDetailDiagnostics {
  /** Master-detail is active when property, reload URL, or line fields are present. */
  active: boolean;
  fieldSource: FormDetailFieldSource;
  propertyName?: string;
  reloadUrl?: string;
  lineClass?: string;
  lineFieldCount: number;
  lineFields: Field[];
  embeddedLinesCount: number;
  inferFieldsOptOut: boolean;
}

export function resolveFormDetailDiagnostics(
  configured: ResourceFormDetail | undefined,
  resolved: ResourceFormDetail | undefined,
  embeddedLines?: EmbeddedLinesBindingSummary[],
): FormDetailDiagnostics {
  const embeddedLinesCount = embeddedLines?.length ?? 0;
  const inferFieldsOptOut = configured?.inferFields === false;
  const hasManualFields = !!(configured?.fields && configured.fields.length > 0);
  const lineFields = (resolved?.fields ?? []) as Field[];
  const binding =
    embeddedLines?.find(
      (entry) => !configured?.propertyName || entry.propertyName === configured.propertyName,
    ) ?? embeddedLines?.[0];

  let fieldSource: FormDetailFieldSource = 'none';
  if (hasManualFields) {
    fieldSource = 'manual';
  } else if (inferFieldsOptOut && embeddedLinesCount > 0) {
    fieldSource = 'opt-out';
  } else if (lineFields.length > 0 && embeddedLinesCount > 0) {
    fieldSource = 'inferred';
  } else if (lineFields.length > 0) {
    fieldSource = 'manual';
  }

  const active = !!(resolved?.propertyName || resolved?.url || lineFields.length > 0);

  return {
    active,
    fieldSource,
    propertyName: resolved?.propertyName ?? binding?.propertyName,
    reloadUrl: resolved?.url ?? binding?.reloadUrl,
    lineClass: binding?.lineClass,
    lineFieldCount: lineFields.length,
    lineFields,
    embeddedLinesCount,
    inferFieldsOptOut,
  };
}