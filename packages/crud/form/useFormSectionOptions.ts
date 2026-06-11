import { useEffect } from 'react';

import type { FormLayoutModel } from './FormLayoutModel';
import type { UseFormSectionOptionsAccessors } from './FormSectionOptionsAccessors';

export type { UseFormSectionOptionsAccessors } from './FormSectionOptionsAccessors';

export function useFormSectionOptions(
  formLayoutModel: FormLayoutModel,
  accessors: UseFormSectionOptionsAccessors,
): void {
  useEffect(() => {
    if (formLayoutModel.type !== 'sections') return;

    formLayoutModel.sections.forEach((section) => {
      try {
        accessors.setItemOption(section.label, 'collapsible', section.collapsible ?? false);
        if (section.defaultCollapsed) {
          accessors.setItemOption(section.label, 'collapsed', true);
        }
      } catch {
        // itemOption may fail if the section name is not registered; ignore silently.
      }
    });
    // Run once after the renderer mounts; layout descriptors are static per form instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
