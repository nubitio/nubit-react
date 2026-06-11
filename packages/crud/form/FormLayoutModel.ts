import type { FormLayout } from './FormLayout';
import type { Field } from '../field/Field';

export interface FormLayoutGroup {
  label: string;
  icon?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  avoidOrphanFields?: boolean;
  fields: Field[];
}

export type FormLayoutModel =
  | { type: 'plain'; fields: Field[] }
  | { type: 'tabs'; tabs: FormLayoutGroup[]; overflow?: FormLayoutGroup }
  | { type: 'sections'; sections: FormLayoutGroup[]; overflow?: FormLayoutGroup };

export function buildFormLayoutModel(
  fields: Field[],
  formLayout: FormLayout | undefined,
  overflowLabel: string,
): FormLayoutModel {
  const pickFields = (names: string[]): Field[] => {
    const byName = new Map(fields.map((field) => [field.name, field]));
    return names.map((name) => byName.get(name)).filter((field): field is Field => field != null);
  };
  const remainingFields = (assignedNames: string[]): Field[] =>
    fields.filter(
      (field) =>
        !assignedNames.includes(field.name) &&
        !field.isIdentity &&
        field.visibleOnForm !== false &&
        !field.hidden,
    );

  if (formLayout?.type === 'tabs') {
    const allAssigned = formLayout.tabs.flatMap((tab) => tab.fields);
    const overflow = remainingFields(allAssigned);

    return {
      type: 'tabs',
      tabs: formLayout.tabs.map((tab) => ({
        label: tab.label,
        icon: tab.icon,
        fields: pickFields(tab.fields),
      })),
      overflow: overflow.length > 0 ? { label: overflowLabel, fields: overflow } : undefined,
    };
  }

  if (formLayout?.type === 'sections') {
    const allAssigned = formLayout.sections.flatMap((section) => section.fields);
    const overflow = remainingFields(allAssigned);

    return {
      type: 'sections',
      sections: formLayout.sections.map((section) => ({
        label: section.label,
        collapsible: section.collapsible,
        defaultCollapsed: section.defaultCollapsed,
        avoidOrphanFields: section.avoidOrphanFields,
        fields: pickFields(section.fields),
      })),
      overflow: overflow.length > 0 ? { label: overflowLabel, fields: overflow } : undefined,
    };
  }

  return { type: 'plain', fields };
}
