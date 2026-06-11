import type { ReactNode } from 'react';

import type { Field } from '../field/Field';

export type FormFieldRenderer = (fields: Field[]) => ReactNode;
