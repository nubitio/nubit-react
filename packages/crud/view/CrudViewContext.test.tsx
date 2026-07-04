import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { forwardRef } from 'react';

import type { DataGridViewOptions } from '../datagrid/DataGridViewOptions';
import type { GridHandle } from '../datagrid/GridHandle';
import type { FormHandle } from '../form/FormHandle';
import type { FormViewOptions } from '../form/FormViewOptions';
import { CrudViewProvider, useCrudViews } from './CrudViewContext';

const StubDataGridView = forwardRef<GridHandle, DataGridViewOptions>(function StubDataGridView(
  { title },
  _ref,
) {
  return <div data-testid="stub-grid">{title}</div>;
});

const StubFormView = forwardRef<FormHandle, FormViewOptions>(function StubFormView(_props, _ref) {
  return <div data-testid="stub-form" />;
});

function Probe() {
  const { DataGridView, FormView } = useCrudViews();
  return (
    <>
      <DataGridView id="products" title="Products" url="/api/products" fields={[]} />
      <FormView url="/api/products" fields={[]} />
    </>
  );
}

describe('CrudViewProvider', () => {
  it('overrides grid and form views', () => {
    render(
      <CrudViewProvider views={{ DataGridView: StubDataGridView, FormView: StubFormView }}>
        <Probe />
      </CrudViewProvider>,
    );

    expect(screen.getByTestId('stub-grid').textContent).toBe('Products');
    expect(screen.getByTestId('stub-form')).toBeTruthy();
  });
});