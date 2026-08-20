import { describe, expect, it } from 'vitest';
import { identityField, textField } from '../field/FieldBuilders';
import { hasVisibleFormFields, isVisibleFormField } from './formFieldVisibility';

describe('isVisibleFormField', () => {
  it('keeps ordinary form fields visible', () => {
    expect(isVisibleFormField(textField().name('name').label('Name').build())).toBe(true);
  });

  it('hides identity, form-hidden, and explicitly hidden fields', () => {
    expect(isVisibleFormField(identityField().build())).toBe(false);
    expect(isVisibleFormField(textField().name('status').visibleOnForm(false).build())).toBe(false);
    expect(isVisibleFormField(textField().name('secret').hidden(true).build())).toBe(false);
  });

  it('honours runtime fieldState.hidden', () => {
    const field = textField().name('city').label('City').build();
    expect(isVisibleFormField(field, { hidden: true })).toBe(false);
    expect(isVisibleFormField(field, { hidden: false })).toBe(true);
  });
});

describe('hasVisibleFormFields', () => {
  it('is false when every header field is identity or form-hidden', () => {
    expect(
      hasVisibleFormFields([
        identityField().build(),
        textField().name('numero').visibleOnForm(false).build(),
        textField().name('estado').hidden(true).build(),
      ]),
    ).toBe(false);
  });

  it('is true when at least one header field renders', () => {
    expect(
      hasVisibleFormFields([
        identityField().build(),
        textField().name('name').label('Name').build(),
      ]),
    ).toBe(true);
  });

  it('treats a runtime-hidden last field as no visible master', () => {
    const name = textField().name('name').label('Name').build();
    expect(hasVisibleFormFields([name], { name: { hidden: true } })).toBe(false);
  });
});
