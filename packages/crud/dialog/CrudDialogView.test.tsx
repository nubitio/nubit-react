import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CrudDialogView } from './CrudDialogView';

afterEach(cleanup);

describe('CrudDialogView flush', () => {
  const dialog = () => screen.getByRole('dialog');

  it('keeps the body padding by default', () => {
    render(
      <CrudDialogView isOpen title="Permisos">
        contenido
      </CrudDialogView>,
    );
    expect(dialog().className).not.toContain('nb-crud-dialog--flush');
  });

  it('marks the dialog so its body loses the padding when flush', () => {
    render(
      <CrudDialogView isOpen flush title="Permisos">
        contenido
      </CrudDialogView>,
    );
    expect(dialog().className).toContain('nb-crud-dialog--flush');
    expect(dialog().className).toContain('nb-crud-dialog');
  });
});
