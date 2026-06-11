import type { DataRecord } from '@nubitio/core';

export type FormDataRecord = DataRecord;

export type FormDataSnapshot = FormDataRecord;

export type FormDataChangedHandler = (formData: FormDataSnapshot) => void;
