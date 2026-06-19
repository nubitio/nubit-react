import { describe, expect, it } from 'vitest';
import { embeddedLinesUrl } from './embeddedLinesUrl';

describe('embeddedLinesUrl', () => {
  it('builds a parent query url with placeholder id', () => {
    expect(embeddedLinesUrl('/api/sales_document_lines', 'document')).toBe(
      '/api/sales_document_lines?document={id}',
    );
  });

  it('appends when the route already has query params', () => {
    expect(embeddedLinesUrl('/api/order_lines?status=open', 'order')).toBe(
      '/api/order_lines?status=open&order={id}',
    );
  });
});