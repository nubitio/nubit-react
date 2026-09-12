import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Radio, RadioGroup } from './RadioGroup';

afterEach(cleanup);

describe('RadioGroup', () => {
  it('selecting one option reports that value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup value="a" onChange={onChange} aria-label="Plan">
        <Radio value="a" label="Starter" />
        <Radio value="b" label="Pro" />
      </RadioGroup>,
    );
    await user.click(screen.getByRole('radio', { name: 'Pro' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
