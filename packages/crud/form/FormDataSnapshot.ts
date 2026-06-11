import type { DataRecord } from '@nubit/core';

export type FormDataRecord = DataRecord;

export type FormDataSnapshot = FormDataRecord;

export type FormDataChangedHandler = (formData: FormDataSnapshot) => void;
