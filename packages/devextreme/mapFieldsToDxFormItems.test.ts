import { describe, expect, it } from 'vitest';
import {
  identityField,
  numberField,
  passwordField,
  selectField,
  textareaField,
} from '@nubitio/crud';
import { mapFieldsToDxFormItems } from './mapFieldsToDxFormItems';

describe('mapFieldsToDxFormItems', () => {
  it('excludes identity and non-form fields and preserves layout metadata', () => {
    const description = textareaField()
      .name('description')
      .label('Description')
      .height(140)
      .col(2)
      .required(true)
      .build();
    const hidden = passwordField().name('secret').visibleOnForm(false).build();
    expect(mapFieldsToDxFormItems([identityField().build(), hidden, description])).toEqual([
      expect.objectContaining({
        dataField: 'description',
        editorType: 'dxTextArea',
        editorOptions: { height: 140 },
        colSpan: 2,
        isRequired: true,
      }),
    ]);
  });

  it('maps password, option-list, and numeric editor options', () => {
    const password = passwordField().name('password').maxLength(64).build();
    const status = selectField()
      .name('status')
      .data([{ code: 'new', title: 'New' }])
      .valueField('code')
      .textField('title')
      .searchEnabled(true)
      .build();
    const amount = numberField().name('amount').precision(3).build();
    const items = mapFieldsToDxFormItems([password, status, amount]);

    expect(items[0]?.editorOptions).toEqual({ mode: 'password', maxLength: 64 });
    expect(items[1]?.editorOptions).toEqual({
      dataSource: [{ code: 'new', title: 'New' }],
      displayExpr: 'title',
      valueExpr: 'code',
      searchEnabled: true,
    });
    expect(items[2]?.editorOptions).toEqual({ format: '#,##0.000' });
  });
});
