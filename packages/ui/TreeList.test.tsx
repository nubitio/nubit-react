import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TreeList } from './TreeList';

afterEach(cleanup);

interface Account {
  id: number;
  parentId?: number | null;
  name: string;
  hasChildren?: boolean;
  children?: Account[];
}

const columns = [
  { id: 'name', header: 'Account', sortable: true },
  { id: 'code', header: 'Code', value: (item: Account) => `A-${item.id}` },
];

const getId = (item: Account) => item.id;
const getParentId = (item: Account) => item.parentId;

describe('TreeList', () => {
  it('renders flat hierarchy and expands children', () => {
    render(
      <TreeList<Account>
        ariaLabel="Chart of accounts"
        items={[
          { id: 1, name: 'Assets' },
          { id: 2, parentId: 1, name: 'Cash' },
        ]}
        getId={getId}
        getParentId={getParentId}
        columns={columns}
        defaultExpandedIds={new Set([1])}
      />,
    );

    expect(screen.getByRole('treegrid', { name: 'Chart of accounts' })).toBeDefined();
    expect(screen.getByText('Assets')).toBeDefined();
    expect(screen.getByText('Cash')).toBeDefined();
    expect(screen.getByText('A-2')).toBeDefined();
  });

  it('accepts nested and flat subtrees together', () => {
    render(
      <TreeList<Account>
        ariaLabel="Accounts"
        items={[
          { id: 1, name: 'Assets', children: [{ id: 2, name: 'Cash' }] },
          { id: 3, parentId: 1, name: 'Receivables' },
        ]}
        getId={getId}
        getParentId={getParentId}
        getChildren={(item) => item.children}
        columns={columns}
        defaultExpandedIds={new Set([1])}
      />,
    );

    expect(screen.getByText('Cash')).toBeDefined();
    expect(screen.getByText('Receivables')).toBeDefined();
  });

  it('loads children lazily and attaches them to the requested parent', async () => {
    const loadChildren = vi.fn(async () => [{ id: 2, name: 'Cash' }]);
    render(
      <TreeList
        ariaLabel="Accounts"
        items={[{ id: 1, name: 'Assets', hasChildren: true }]}
        getId={getId}
        getParentId={getParentId}
        withParent={(child, parent) => ({ ...child, parentId: parent.id })}
        hasChildren={(item) => !!item.hasChildren}
        loadChildren={loadChildren}
        columns={columns}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expand Assets' }));
    await waitFor(() => expect(screen.getByText('Cash')).toBeDefined());
    expect(loadChildren).toHaveBeenCalledOnce();
    expect(screen.getByText('Cash').closest('tr')?.getAttribute('aria-level')).toBe('2');
  });

  it('allows lazy expansion when child presence is not known up front', async () => {
    const loadChildren = vi.fn(async () => [{ id: 2, name: 'Cash' }]);
    render(
      <TreeList
        ariaLabel="Accounts"
        items={[{ id: 1, name: 'Assets' }]}
        getId={getId}
        getParentId={getParentId}
        loadChildren={loadChildren}
        columns={columns}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expand Assets' }));
    await waitFor(() => expect(screen.getByText('Cash')).toBeDefined());
    expect(loadChildren).toHaveBeenCalledOnce();
  });

  it('selects loaded descendants with a multiple selection', () => {
    const onSelectedIdsChange = vi.fn();
    render(
      <TreeList
        ariaLabel="Accounts"
        items={[
          { id: 1, name: 'Assets' },
          { id: 2, parentId: 1, name: 'Cash' },
        ]}
        getId={getId}
        getParentId={getParentId}
        columns={columns}
        selectionMode="multiple"
        onSelectedIdsChange={onSelectedIdsChange}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row Assets' }));
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(new Set([1, 2]));
  });

  it('filters across columns and exposes matching descendants', () => {
    render(
      <TreeList
        ariaLabel="Accounts"
        items={[
          { id: 1, name: 'Assets' },
          { id: 2, parentId: 1, name: 'Cash' },
          { id: 3, name: 'Liabilities' },
        ]}
        getId={getId}
        getParentId={getParentId}
        columns={columns}
      />,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter rows' }), {
      target: { value: 'Cash' },
    });
    expect(screen.getByText('Assets')).toBeDefined();
    expect(screen.getByText('Cash')).toBeDefined();
    expect(screen.queryByText('Liabilities')).toBeNull();
  });

  it('reports drag moves as a proposed parent change', () => {
    const onMove = vi.fn();
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn().mockReturnValue('3'),
      effectAllowed: 'move',
      dropEffect: 'move',
    };
    render(
      <TreeList<Account>
        ariaLabel="Accounts"
        items={[
          { id: 1, name: 'Assets' },
          { id: 2, name: 'Cash' },
          { id: 3, name: 'Liabilities' },
        ]}
        getId={getId}
        getParentId={getParentId}
        columns={columns}
        onMove={onMove}
      />,
    );

    fireEvent.drop(screen.getByText('Assets').closest('tr')!, { dataTransfer, clientY: 0 });
    expect(onMove).toHaveBeenCalledWith({
      item: { id: 3, name: 'Liabilities' },
      newParent: { id: 1, name: 'Assets' },
      index: 0,
      position: 'inside',
    });
  });

  it('surfaces a rejected move without hiding the tree', async () => {
    const onMove = vi.fn().mockRejectedValue(new Error('Forbidden'));
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn().mockReturnValue('3'),
      effectAllowed: 'move',
      dropEffect: 'move',
    };
    render(
      <TreeList<Account>
        ariaLabel="Accounts"
        items={[
          { id: 1, name: 'Assets' },
          { id: 3, name: 'Liabilities' },
        ]}
        getId={getId}
        getParentId={getParentId}
        columns={columns}
        onMove={onMove}
      />,
    );

    fireEvent.drop(screen.getByText('Assets').closest('tr')!, { dataTransfer, clientY: 0 });
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByText('Liabilities')).toBeDefined();
  });
});

describe('TreeList options', () => {
  const accounts: Account[] = [
    { id: 1, name: 'Assets' },
    { id: 2, parentId: 1, name: 'Cash' },
    { id: 3, parentId: 1, name: 'Bank' },
    { id: 4, name: 'Liabilities' },
  ];
  const base = {
    ariaLabel: 'Accounts',
    items: accounts,
    getId,
    getParentId,
    columns: [{ id: 'name', header: 'Account' }],
  };
  const rootOf = () => document.querySelector('.nb-tree-list') as HTMLElement;

  it('names each row for assistive technology by its text, or by getRowLabel', () => {
    const { rerender } = render(
      <TreeList<Account> {...base} selectionMode="multiple" defaultExpandedIds={new Set([1])} />,
    );
    expect(screen.getByRole('checkbox', { name: 'Select row Cash' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Collapse Assets' })).toBeDefined();

    rerender(
      <TreeList<Account>
        {...base}
        selectionMode="multiple"
        getRowLabel={(item) => `cuenta ${item.id}`}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Select row cuenta 4' })).toBeDefined();
  });

  it('falls back to the id when a row has no text', () => {
    render(<TreeList<Account> {...base} items={[{ id: 9, name: '' }]} selectionMode="multiple" />);
    expect(screen.getByRole('checkbox', { name: 'Select row 9' })).toBeDefined();
  });

  describe('recursive selection', () => {
    const renderRecursive = (onChange = vi.fn(), selected: number[] = []) => {
      render(
        <TreeList<Account>
          {...base}
          selectionMode="multiple"
          recursiveSelection
          selectedIds={new Set(selected)}
          onSelectedIdsChange={onChange}
          defaultExpandedIds={new Set([1])}
        />,
      );
      return onChange;
    };
    const box = (name: string) =>
      screen.getByRole('checkbox', { name: `Select row ${name}` }) as HTMLInputElement;

    it('shows a parent with some children selected as indeterminate', () => {
      renderRecursive(vi.fn(), [2]);
      expect(box('Assets').indeterminate).toBe(true);
      expect(box('Assets').checked).toBe(false);
      expect(box('Cash').checked).toBe(true);
    });

    it('shows a parent with all children selected as checked', () => {
      renderRecursive(vi.fn(), [2, 3]);
      expect(box('Assets').checked).toBe(true);
      expect(box('Assets').indeterminate).toBe(false);
    });

    it('selecting a partly selected parent selects every child and the parent', () => {
      const onChange = renderRecursive(vi.fn(), [2]);
      fireEvent.click(box('Assets'));
      expect(onChange).toHaveBeenLastCalledWith(new Set([1, 2, 3]));
    });

    it('clearing a fully selected parent clears the children', () => {
      const onChange = renderRecursive(vi.fn(), [1, 2, 3]);
      fireEvent.click(box('Assets'));
      expect(onChange).toHaveBeenLastCalledWith(new Set());
    });

    it('selecting the last unselected child gives the parent its id too', () => {
      const onChange = renderRecursive(vi.fn(), [2]);
      fireEvent.click(box('Bank'));
      expect(onChange).toHaveBeenLastCalledWith(new Set([1, 2, 3]));
    });

    it('unselecting one child takes the parent id out', () => {
      const onChange = renderRecursive(vi.fn(), [1, 2, 3]);
      fireEvent.click(box('Cash'));
      expect(onChange).toHaveBeenLastCalledWith(new Set([3]));
    });
  });

  it('can hide the select-all checkbox, or the whole header', () => {
    const { unmount } = render(<TreeList<Account> {...base} selectionMode="multiple" />);
    expect(screen.getByRole('checkbox', { name: 'Select all visible rows' })).toBeDefined();
    unmount();

    const second = render(
      <TreeList<Account> {...base} selectionMode="multiple" allowSelectAll={false} />,
    );
    expect(screen.queryByRole('checkbox', { name: 'Select all visible rows' })).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Account' })).toBeDefined();
    second.unmount();

    render(<TreeList<Account> {...base} showColumnHeaders={false} />);
    expect(screen.queryByRole('columnheader')).toBeNull();
    expect(screen.getByText('Assets')).toBeDefined();
  });

  it('turns presentation options into modifiers on the root', () => {
    render(
      <TreeList<Account>
        {...base}
        showBorders={false}
        showRowLines={false}
        rowAlternationEnabled
        hoverStateEnabled={false}
        highlightSelectedRows={false}
      />,
    );
    const root = rootOf();
    for (const modifier of [
      'borderless',
      'no-row-lines',
      'striped',
      'no-hover',
      'no-selection-tint',
    ]) {
      expect(root.classList.contains(`nb-tree-list--${modifier}`), modifier).toBe(true);
    }
  });

  it('leaves the defaults plain: borders, row lines, hover and selection tint on', () => {
    render(<TreeList<Account> {...base} />);
    expect(rootOf().className).not.toMatch(
      /--(borderless|no-row-lines|striped|no-hover|no-selection)/,
    );
  });

  it('caps the height of the scrolling area and sets the search placeholder', () => {
    render(<TreeList<Account> {...base} maxHeight={240} filterPlaceholder="Buscar cuenta" />);
    expect((document.querySelector('.nb-tree-list__scroll') as HTMLElement).style.maxHeight).toBe(
      '240px',
    );
    expect(screen.getByPlaceholderText('Buscar cuenta')).toBeDefined();
  });

  describe('autoExpandAll', () => {
    it('opens every node that has children at first', () => {
      render(<TreeList<Account> {...base} autoExpandAll />);
      expect(screen.getByText('Cash')).toBeDefined();
      expect(screen.getByText('Bank')).toBeDefined();
    });

    it('keeps closed what the person closed', () => {
      const { rerender } = render(<TreeList<Account> {...base} autoExpandAll />);
      fireEvent.click(screen.getByRole('button', { name: 'Collapse Assets' }));
      expect(screen.queryByText('Cash')).toBeNull();

      rerender(<TreeList<Account> {...base} items={[...accounts]} autoExpandAll />);
      expect(screen.queryByText('Cash')).toBeNull();
    });

    it('opens parents that arrive later', () => {
      const { rerender } = render(
        <TreeList<Account> {...base} items={[{ id: 1, name: 'Assets' }]} autoExpandAll />,
      );
      rerender(<TreeList<Account> {...base} autoExpandAll />);
      expect(screen.getByText('Cash')).toBeDefined();
    });

    it('does nothing when the expansion is controlled', () => {
      render(<TreeList<Account> {...base} autoExpandAll expandedIds={new Set()} />);
      expect(screen.queryByText('Cash')).toBeNull();
    });
  });
});
