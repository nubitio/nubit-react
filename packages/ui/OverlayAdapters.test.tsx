import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableAppDropdown } from './SearchableAppDropdown';
import { ContextMenu } from './ContextMenu';
import { Button } from './Button';

afterEach(cleanup);

describe('overlay compatibility adapters', () => {
  it('resolves async search while retaining the selected label and public callbacks', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    const onSearch = vi.fn(async () => [{ value: '0', label: 'Zero owner' }]);
    function Owner() {
      const [value, setValue] = useState('2');
      return (
        <SearchableAppDropdown
          label="Owner"
          value={value}
          selectedOption={{ value: '2', label: 'Previous owner' }}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
          onSearch={onSearch}
          onOpenChange={onOpenChange}
        />
      );
    }
    render(<Owner />);
    const input = screen.getByRole('combobox', { name: 'Owner' });
    expect((input as HTMLInputElement).value).toBe('Previous owner');
    await user.clear(input);
    await user.type(input, 'Zero');
    await user.click(await screen.findByRole('option', { name: 'Zero owner' }));
    expect(onSearch).toHaveBeenLastCalledWith('Zero');
    expect(onChange).toHaveBeenCalledWith('0');
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps non-searchable selected labels and option values', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableAppDropdown
        searchable={false}
        label="Sort"
        value="long"
        options={[
          { value: 'long', label: 'Long description', selectedLabel: 'Short' },
          { value: 'next', label: 'Next' },
        ]}
        onChange={onChange}
      />,
    );
    const trigger = screen.getByRole('combobox', { name: 'Sort Short' });
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith('next');
  });

  it('composes a custom menu trigger without nesting buttons or losing its handler', async () => {
    const user = userEvent.setup();
    const triggerClick = vi.fn();
    const action = vi.fn();
    render(
      <ContextMenu
        trigger={<Button onClick={triggerClick}>Actions</Button>}
        items={[{ label: 'Run action', onClick: action }]}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger.querySelector('button')).toBeNull();
    await user.click(trigger);
    expect(triggerClick).toHaveBeenCalledOnce();
    await user.click(await screen.findByRole('menuitem', { name: 'Run action' }));
    expect(action).toHaveBeenCalledOnce();
  });
});
