import { describe, expect, it } from 'vitest';
import { mapApiViolations } from './FormApiViolations';

describe('mapApiViolations', () => {
  it('maps direct field violations', () => {
    expect(mapApiViolations([
      { propertyPath: 'name', message: 'Nombre requerido' },
    ])).toEqual({
      fieldErrors: { name: 'Nombre requerido' },
      detailErrors: {},
      unassigned: [],
    });
  });

  it('normalizes Symfony children paths', () => {
    expect(mapApiViolations([
      { propertyPath: 'children[name].data', message: 'Nombre invalido' },
      { propertyPath: '[email]', message: 'Email invalido' },
    ]).fieldErrors).toEqual({
      name: 'Nombre invalido',
      email: 'Email invalido',
    });
  });

  it('maps dot detail row paths', () => {
    expect(mapApiViolations([
      { propertyPath: 'items[0].quantity', message: 'Cantidad requerida' },
      { propertyPath: 'items[1].price', message: 'Precio requerido' },
    ])).toEqual({
      fieldErrors: {},
      detailErrors: {
        0: { quantity: 'Cantidad requerida' },
        1: { price: 'Precio requerido' },
      },
      unassigned: [],
    });
  });

  it('maps bracket detail row paths with a custom detail property', () => {
    expect(mapApiViolations([
      { propertyPath: 'lines[0][unitPrice]', message: 'Precio invalido' },
    ], 'lines').detailErrors).toEqual({
      0: { unitPrice: 'Precio invalido' },
    });
  });

  it('returns unassigned messages for violations without a path', () => {
    expect(mapApiViolations([
      { message: 'Error general' },
    ])).toEqual({
      fieldErrors: {},
      detailErrors: {},
      unassigned: ['Error general'],
    });
  });
});
