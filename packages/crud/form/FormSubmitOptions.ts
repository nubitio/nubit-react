import type { CoreHttpClient, FormEventNames } from '@nubitio/core';
import type { Field } from '../field/Field';
import type { BackendAdapter } from '../adapter/BackendAdapter';

export interface UseFormSubmitOptions {
  url: string;
  detailUrl?: string;
  fields: Field[];
  detailFields?: Field[];
  detailPropertyName: string;
  format?: 'json' | 'multipart';
  events?: FormEventNames;
  formErrorsEvent?: string;
  onSaveSuccess?: (response: unknown) => void;
  onSaveError?: (error?: unknown) => void;
  onDeleteSuccess?: (response: unknown) => void;
  onDeleteError?: (error?: unknown) => void;
  onLoadingChange?: (loading: boolean) => void;
  httpClient: CoreHttpClient;
  adapter?: BackendAdapter;
}
