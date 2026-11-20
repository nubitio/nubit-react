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

    fireEvent.click(screen.getByRole('button', { name: 'Expand 1' }));
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

    fireEvent.click(screen.getByRole('button', { name: 'Expand 1' }));
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

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
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
