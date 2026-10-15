import { createRef, useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';
import { RadioGroup } from './RadioGroup';

afterEach(cleanup);

describe('selection controls', () => {
  it('toggles a checkbox by its visible label and submits its native value', async () => {
    const user = userEvent.setup();
    render(
      <form aria-label="Preferences">
        <Checkbox name="updates" value="yes" label="Updates" />
      </form>,
    );
    await user.click(screen.getByText('Updates'));
    const form = screen.getByRole('form') as HTMLFormElement;
    expect(new FormData(form).get('updates')).toBe('yes');
    await user.keyboard(' ');
    expect(new FormData(form).get('updates')).toBeNull();
  });

  it('updates the mixed state and forwards the input ref', () => {
    const ref = createRef<HTMLInputElement>();
    const { rerender } = render(<Checkbox ref={ref} indeterminate aria-label="All rows" />);
    expect(ref.current?.indeterminate).toBe(true);
    rerender(<Checkbox ref={ref} aria-label="All rows" />);
    expect(ref.current?.indeterminate).toBe(false);
  });

  it('keeps a disabled checkbox unchanged and exposes invalid state', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Archived" disabled invalid onChange={onChange} />);
    await userEvent.setup().click(screen.getByText('Archived'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox').getAttribute('aria-invalid')).toBe('true');
  });

  it('changes a controlled radio group and submits the selected value', async () => {
    function Example() {
      const [value, setValue] = useState('email');
      return (
        <form aria-label="Contact">
          <RadioGroup
            label="Channel"
            name="channel"
            value={value}
            onChange={setValue}
            options={[
              { value: 'email', label: 'Email' },
              { value: 'sms', label: 'SMS' },
            ]}
          />
        </form>
      );
    }
    render(<Example />);
    await userEvent.setup().click(screen.getByRole('radio', { name: 'SMS' }));
    expect((screen.getByRole('radio', { name: 'Email' }) as HTMLInputElement).checked).toBe(false);
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('channel')).toBe('sms');
  });

  it('disables the complete radio group', async () => {
    const onChange = vi.fn();
    render(
      <RadioGroup
        label="Channel"
        disabled
        value="email"
        onChange={onChange}
        options={[{ value: 'sms', label: 'SMS' }]}
      />,
    );
    await userEvent.setup().click(screen.getByRole('radio'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
