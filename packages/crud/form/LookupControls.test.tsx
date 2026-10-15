import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { enumField } from '../field/FieldBuilders';
import { NativeEnumSelect } from './LookupControls';

afterEach(cleanup);

it('preserves numeric zero when a searchable enum option is chosen', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const field = enumField([
    { value: 0, text: 'Zero' },
    { value: 2, text: 'Two' },
  ])
    .name('level')
    .label('Level')
    .build();
  render(
    <NativeEnumSelect className="nb-form__control" field={field} value={2} onChange={onChange} />,
  );
  const input = screen.getByRole('combobox', { name: 'Level' });
  await user.clear(input);
  await user.type(input, 'Zero');
  await user.click(await screen.findByRole('option', { name: 'Zero' }));
  expect(onChange).toHaveBeenCalledWith(0);
});
