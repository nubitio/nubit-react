import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';
import { Pagination } from './Pagination';
import { UiStringsProvider } from './UiStrings';

type Row = { id: number; name: string };

const rows: Row[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
];

describe('DataTable', () => {
  it('renders rows and row actions', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <UiStringsProvider strings={{ rowActions: 'Acciones' }}>
        <DataTable
          rows={rows}
          getRowKey={(row) => row.id}
          columns={[
            { id: 'id', header: 'ID', accessor: (row) => row.id },
            { id: 'name', header: 'Name', accessor: (row) => row.name },
          ]}
          rowActions={() => [{ label: 'Edit', onClick: onEdit }]}
        />
      </UiStringsProvider>,
    );

    expect(screen.getByText('Alpha')).toBeTruthy();
    await user.click(screen.getAllByRole('button', { name: 'Acciones' })[0]!);
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeTruthy();
    });
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('renders empty message when there are no rows', () => {
    render(
      <DataTable
        rows={[]}
        getRowKey={(row: Row) => row.id}
        columns={[{ id: 'name', header: 'Name', accessor: (row) => row.name }]}
        emptyMessage="No data"
      />,
    );

    expect(screen.getByText('No data')).toBeTruthy();
  });
});

describe('Pagination', () => {
  it('changes page via buttons', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <UiStringsProvider strings={{ pages: 'Páginas' }}>
        <Pagination page={2} totalPages={4} onPageChange={onPageChange} />
      </UiStringsProvider>,
    );

    await user.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});