import { describe, expect, it } from 'vitest';
import { textField, identityField } from '../field/FieldBuilders';
import { buildFormLayoutModel } from './FormLayoutModel';

describe('column form layout', () => {
  const fields = [
    identityField().build(),
    textField().name('name').build(),
    textField().name('price').build(),
    textField().name('active').build(),
    textField().name('notes').build(),
    textField().name('secret').visibleOnForm(false).build(),
  ];

  it('assigns each field once, ignores unknown fields and preserves unassigned controls', () => {
    const model = buildFormLayoutModel(
      fields,
      {
        type: 'columns',
        main: [{ label: 'General', fields: ['name', 'name', 'missing', 'price'] }],
        aside: [{ label: 'Availability', fields: ['name', 'active'] }],
      },
      'Other',
    );
    expect(model.type).toBe('columns');
    if (model.type !== 'columns') throw new Error('Expected columns');
    expect(model.main[0].fields.map((field) => field.name)).toEqual(['name', 'price']);
    expect(model.aside[0].fields.map((field) => field.name)).toEqual(['active']);
    expect(model.overflow?.fields.map((field) => field.name)).toEqual(['notes']);
  });

  it('preserves descriptions and reactive supplementary renderers', () => {
    const renderAfter = () => 'Summary';
    const model = buildFormLayoutModel(
      fields,
      {
        type: 'columns',
        main: [{ label: 'Pricing', fields: ['price'], description: 'Final price', renderAfter }],
        aside: [],
      },
      'Other',
    );
    if (model.type !== 'columns') throw new Error('Expected columns');
    expect(model.main[0].description).toBe('Final price');
    expect(model.main[0].renderAfter).toBe(renderAfter);
  });
});
