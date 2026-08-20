import { describe, expect, it } from 'vitest';
import { dateField, numberField, switchField, textField } from '@nubitio/crud';
import { mapFieldsToDxColumns } from './mapFieldsToDxColumns';

describe('mapFieldsToDxColumns', () => {
  it('filters, orders, and maps field metadata', () => {
    const name = textField()
      .name('name')
      .label('Name')
      .sortable(true)
      .filterable(true)
      .width(240)
      .build();
    const amount = numberField().name('amount').label('Amount').format('#,##0.00').build();
    const hidden = textField().name('internal').hidden(true).build();
    name.order = 2;
    amount.order = 1;

    expect(mapFieldsToDxColumns([name, hidden, amount])).toEqual([
      expect.objectContaining({ dataField: 'amount', dataType: 'number', format: '#,##0.00' }),
      expect.objectContaining({
        dataField: 'name',
        caption: 'Name',
        allowSorting: true,
        allowFiltering: true,
        width: 240,
      }),
    ]);
  });

  it('honors visible-column selection and semantic control kinds', () => {
    const active = switchField().name('active').build();
    const date = dateField().name('issuedAt').build();
    const name = textField().name('name').build();
    expect(mapFieldsToDxColumns([active, date, name], ['active', 'issuedAt'])).toEqual([
      expect.objectContaining({ dataField: 'active', dataType: 'boolean' }),
      expect.objectContaining({ dataField: 'issuedAt', dataType: 'date' }),
    ]);
  });
});
