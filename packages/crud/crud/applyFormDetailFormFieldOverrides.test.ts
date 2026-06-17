import { describe, expect, it } from 'vitest';
import { textField } from '../field/FieldBuilders';
import { applyFormDetailFormFieldOverrides } from './applyFormDetailFormFieldOverrides';

describe('applyFormDetailFormFieldOverrides', () => {
  it('hides the formDetail property from the header form only', () => {
    const lines = textField().name('lines').label('Lines').build();
    const number = textField().name('number').label('Number').build();

    const result = applyFormDetailFormFieldOverrides(
      [lines, number],
      { propertyName: 'lines' },
    );

    expect(result[0].visibleOnForm).toBe(false);
    expect(result[0].hidden).toBe(true);
    expect(result[0].visible).toBe(true);
    expect(result[1].visibleOnForm).not.toBe(false);
  });

  it('is a no-op when formDetail has no propertyName', () => {
    const field = textField().name('lines').label('Lines').build();
    expect(applyFormDetailFormFieldOverrides([field], {})).toStrictEqual([field]);
  });
});