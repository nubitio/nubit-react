import type { FormLayout, FormSection } from './FormLayout';
import type { Field } from '../field/Field';

export interface FormLayoutGroup {
  label: string;
  description?: FormSection['description'];
  renderAfter?: FormSection['renderAfter'];
  icon?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  avoidOrphanFields?: boolean;
  fields: Field[];
}

export type FormLayoutModel =
  | { type: 'plain'; fields: Field[] }
  | { type: 'tabs'; tabs: FormLayoutGroup[]; overflow?: FormLayoutGroup }
  | {
      type: 'columns';
      main: FormLayoutGroup[];
      aside: FormLayoutGroup[];
      overflow?: FormLayoutGroup;
    }
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
        description: section.description,
        renderAfter: section.renderAfter,
        collapsible: section.collapsible,
        defaultCollapsed: section.defaultCollapsed,
        avoidOrphanFields: section.avoidOrphanFields,
        fields: pickFields(section.fields),
      })),
      overflow: overflow.length > 0 ? { label: overflowLabel, fields: overflow } : undefined,
    };
  }

  if (formLayout?.type === 'columns') {
    // A control must only mount once, even if a field is accidentally assigned twice.
    const assigned = new Set<string>();
    const resolve = (sections: FormSection[]) =>
      sections.map((section) => ({
        ...section,
        fields: pickFields(section.fields).filter((field) => {
          if (assigned.has(field.name)) return false;
          assigned.add(field.name);
          return true;
        }),
      }));
    const main = resolve(formLayout.main);
    const aside = resolve(formLayout.aside);
    const overflow = remainingFields([...assigned]);
    return {
      type: 'columns',
      main,
      aside,
      overflow: overflow.length > 0 ? { label: overflowLabel, fields: overflow } : undefined,
    };
  }

  return { type: 'plain', fields };
}
