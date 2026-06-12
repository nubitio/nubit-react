import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import { FileUploadField, isUploadableFileField } from '../../../form/FileUploadField';
import {
  defaultBuildFilterTerms,
  getPrimitiveDisplay,
  KEEP,
  OMIT,
  set,
  TEXT_OPERATORS,
} from '../shared';

export const fileTypeModule: FieldTypeModule = {
  defaultFilterOperator: 'contains',
  filterOperators: TEXT_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (_field, value, ctx) => getPrimitiveDisplay(value, ctx.yesLabel, ctx.noLabel),
  // Multipart submissions send the first raw File; JSON submissions drop raw
  // FileList arrays (instant-upload fields already wrote their media IRI).
  serializeFormValue: (field, value, ctx) => {
    if (ctx.format === 'multipart' && ctx.getFieldValue) {
      const files = ctx.getFieldValue(field.name) as File[] | FileList | null | undefined;
      if (files && files.length > 0) return set(files[0]);
      return OMIT;
    }
    return Array.isArray(value) ? OMIT : KEEP;
  },
  serializeDetailValue: () => KEEP,
  ControlRender: ({ field, error, disabled, readOnly, commonProps, setFieldValue, ctx }) => {
    // Fields with an upload URL get the instant-upload widget; bare FILE
    // fields keep the raw input (submitted in multipart mode).
    if (isUploadableFileField(field)) {
      return (
        <FileUploadField
          field={field}
          disabled={disabled}
          readOnly={readOnly}
          invalid={!!error}
          existingMedia={ctx.getExistingMedia(field.name)}
          uploadUrl={field.url}
          httpClient={ctx.httpClient}
          t={ctx.t}
          onUploaded={ctx.upsertUploadedFile}
          onCleared={(fieldName) => {
            ctx.clearExistingMedia(fieldName);
            ctx.upsertUploadedFile({ name: fieldName, iri: null });
          }}
        />
      );
    }
    return (
      <input
        {...commonProps}
        type="file"
        accept={field.accept ?? undefined}
        readOnly={undefined}
        onChange={(event) => {
          setFieldValue(field.name, event.target.files ?? null);
        }}
      />
    );
  },
};
