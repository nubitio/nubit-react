import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { textField } from '../field/FieldBuilders';
import { useSmartCrudFields } from './useSmartCrudFields';

function createWrapper() {
  const queryClient = new QueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useSmartCrudFields', () => {
  it('does not hide grid columns just because they are hidden from forms', () => {
    const field = textField().name('warehouse').label('Almacen').visibleOnForm(false).build();

    const { result } = renderHook(() => useSmartCrudFields([field], null, null, []), {
      wrapper: createWrapper(),
    });

    expect(result.current.processedFields[0].visible).toBe(true);
    expect(result.current.processedFields[0].hidden).toBe(false);
    expect(result.current.processedFields[0].visibleOnForm).toBe(false);
  });

  it('keeps grid columns visible while hiding fields from active forms', () => {
    const field = textField().name('warehouse').label('Almacen').visibleOnForm(false).build();

    const { result } = renderHook(() => useSmartCrudFields([field], 'create', {}, []), {
      wrapper: createWrapper(),
    });

    expect(result.current.gridFields[0].hidden).toBe(false);
    expect(result.current.processedFields[0].hidden).toBe(false);
    expect(result.current.processedFields[0].visibleOnForm).toBe(false);
  });
});
