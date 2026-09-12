import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';
import { UiStringsProvider } from './UiStrings';

afterEach(cleanup);

describe('Spinner', () => {
  it('uses the default loading string as its accessible name', () => {
    render(<Spinner />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy();
  });

  it('uses a custom label', () => {
    render(
      <UiStringsProvider strings={{ loading: 'Cargando' }}>
        <Spinner />
      </UiStringsProvider>,
    );
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeTruthy();
  });
});
