import { afterEach, describe, expect, it, vi } from 'vitest';

const ejectFieldsFromDocs = vi.hoisted(() => vi.fn());
vi.mock('./ejectFromDocs', () => ({ ejectFieldsFromDocs }));

import { runCli } from './runCli';

function context(rest: string[] = []) {
  return {
    rest,
    flag: (name: string, fallback: string) => {
      const index = rest.indexOf(name);
      return index < 0 ? fallback : (rest[index + 1] ?? fallback);
    },
    writeFileSync: vi.fn(),
    resolve: (...paths: string[]) => `/workspace/${paths.join('/')}`,
  };
}

describe('runCli', () => {
  afterEach(() => vi.restoreAllMocks());

  it('prints help when no command is provided', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCli({ ...context(), command: undefined, target: undefined });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('nubit eject fields'));
  });

  it('writes a generated page to the resolved output path', async () => {
    const ctx = context([
      'ProductsPage',
      '/api/products',
      '--out',
      'ProductsPage.tsx',
      '--title',
      'Products',
    ]);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCli({ ...ctx, command: 'eject', target: 'page' });
    expect(ctx.writeFileSync).toHaveBeenCalledWith(
      '/workspace/ProductsPage.tsx',
      expect.stringContaining('export function ProductsPage()'),
    );
  });

  it('writes fields discovered from API documentation', async () => {
    ejectFieldsFromDocs.mockResolvedValue({
      apiUrl: '/api/products',
      className: 'Product',
      fields: [],
    });
    const ctx = context(['/api/products', '--out', 'products.fields.ts']);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCli({ ...ctx, command: 'eject', target: 'fields' });
    expect(ejectFieldsFromDocs).toHaveBeenCalledWith(
      '/api/products',
      'http://localhost:8000/api/docs.jsonld',
    );
    expect(ctx.writeFileSync).toHaveBeenCalledWith(
      '/workspace/products.fields.ts',
      expect.stringContaining("defineResource('/api/products'"),
    );
  });

  it('rejects unknown commands', async () => {
    await expect(
      runCli({ ...context(), command: 'remove', target: 'fields' }),
    ).rejects.toThrow('Unknown command: remove fields');
  });
});
