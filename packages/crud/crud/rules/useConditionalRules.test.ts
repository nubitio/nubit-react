import { describe, expect, it } from 'vitest';
import { FieldBuilder } from '../../field/FieldBuilder';
import { evaluateConditionalRuleState } from './useConditionalRules';

describe('evaluateConditionalRuleState', () => {
  it('evaluates requiredWhen against the current form data', () => {
    const field = new FieldBuilder()
      .name('rejectionReason')
      .label('Motivo')
      .requiredWhen((data) => data['status'] === 'rejected')
      .build();

    expect(evaluateConditionalRuleState(field, { status: 'draft' }).required).toBe(false);
    expect(evaluateConditionalRuleState(field, { status: 'rejected' }).required).toBe(true);
  });

  it('keeps statically required fields required when requiredWhen is false', () => {
    const field = new FieldBuilder()
      .name('name')
      .label('Nombre')
      .required(true)
      .requiredWhen(() => false)
      .build();

    expect(evaluateConditionalRuleState(field, {}).required).toBe(true);
  });

  it('applies defaultWhen when the current field value is empty', () => {
    const field = new FieldBuilder()
      .name('currency')
      .label('Moneda')
      .defaultWhen((data) => (data['country'] === 'PE' ? 'PEN' : 'USD'))
      .build();

    expect(evaluateConditionalRuleState(field, { country: 'PE', currency: '' })).toMatchObject({
      computedValue: 'PEN',
    });
  });

  it('does not apply defaultWhen over an existing value', () => {
    const field = new FieldBuilder()
      .name('currency')
      .label('Moneda')
      .defaultWhen(() => 'PEN')
      .build();

    expect(evaluateConditionalRuleState(field, { currency: 'USD' }).computedValue).toBeUndefined();
  });

  it('emits a null computed value when clearWhenHidden hides the field', () => {
    const field = new FieldBuilder()
      .name('discount')
      .label('Descuento')
      .visibleWhen((data) => data['hasDiscount'] === true)
      .clearWhenHidden()
      .build();

    expect(evaluateConditionalRuleState(field, { hasDiscount: false })).toMatchObject({
      visible: false,
      computedValue: null,
    });
  });

  it('does not clear hidden fields unless clearWhenHidden is enabled', () => {
    const field = new FieldBuilder()
      .name('discount')
      .label('Descuento')
      .visibleWhen(() => false)
      .build();

    expect(evaluateConditionalRuleState(field, {}).computedValue).toBeUndefined();
  });
});
