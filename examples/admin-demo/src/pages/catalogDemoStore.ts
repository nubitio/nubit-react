import { CoreHttpClient, type CoreHttpResponse, type DataRecord } from '@nubitio/core';
import type { ResourceStoreFactory } from '@nubitio/react-admin';

// Deliberately local: exercises the real grid/form contract without ERP credentials.
// Changes last only for this mounted demo. This is not a persistence adapter.
const names = ['Wireless mouse', 'Keyboard', 'USB cable', 'Notebook', 'Headphones', 'Webcam'];

function response<T>(data: unknown): CoreHttpResponse<T> {
  const result = Response.json(data);
  return { data: data as T, status: result.status, headers: result.headers, response: result };
}

function matches(row: DataRecord, expression: unknown): boolean {
  if (!Array.isArray(expression) || expression.length === 0) return true;
  const [field, operator, value] = expression;
  if (typeof field === 'string' && typeof operator === 'string' && !Array.isArray(value)) {
    const actual = String(row[field] ?? '').toLowerCase();
    const expected = String(value ?? '').toLowerCase();
    if (operator === 'contains') return actual.includes(expected);
    if (operator === '=') return actual === expected;
    return true;
  }
  return expression.filter(Array.isArray).every((child) => matches(row, child));
}

export class CatalogDemoClient extends CoreHttpClient {
  private hasFailed = false;
  constructor(readonly scenario = 'normal') {
    super();
    if (scenario === 'empty') this.records = [];
  }
  private records: DataRecord[] = Array.from({ length: 26 }, (_, index) => ({
    id: index + 1,
    name: `${names[index % names.length]} ${index + 1}`,
    sku: `DEMO-${String(index + 1).padStart(3, '0')}`,
    category: index % 2 === 0 ? 'Accessories' : 'Office',
    price: (12 + index).toFixed(2),
    cost: '8.00',
    stock: index % 3 === 0 ? 0 : index + 1,
    active: true,
    notes: '',
  }));

  readonly factory: ResourceStoreFactory = () => ({
    load: async (options) => {
      if (this.scenario === 'forbidden')
        throw Object.assign(new Error('Forbidden'), { status: 403 });
      if (this.scenario === 'error' && !this.hasFailed) {
        this.hasFailed = true;
        throw Object.assign(new Error('Demo failure'), { status: 503 });
      }
      const rows = this.records.filter((row) => matches(row, options.filter));
      for (const sort of [...(options.sort ?? [])].reverse()) {
        if (typeof sort !== 'object' || !sort.selector) continue;
        const selector = sort.selector;
        rows.sort(
          (a, b) =>
            String(a[selector] ?? '').localeCompare(String(b[selector] ?? ''), undefined, {
              numeric: true,
            }) * (sort.desc ? -1 : 1),
        );
      }
      const skip = Number(options.skip ?? 0);
      const take = Number(options.take ?? rows.length);
      return { data: rows.slice(skip, skip + take), totalCount: rows.length, summary: null };
    },
    byKey: async (key) => this.records.find((row) => String(row.id) === String(key)) ?? null,
  });

  override async get<T>(url: string): Promise<CoreHttpResponse<T>> {
    const key = url.split('/').pop();
    return response<T>(this.records.find((row) => String(row.id) === key) ?? null);
  }

  override async post<T>(_url: string, data?: unknown): Promise<CoreHttpResponse<T>> {
    const id = Math.max(...this.records.map((row) => Number(row.id)), 0) + 1;
    const record = { ...(data as DataRecord), id };
    this.records.push(record);
    return response<T>(record);
  }

  override async patch<T>(url: string, data?: unknown): Promise<CoreHttpResponse<T>> {
    const key = url.split('/').pop();
    const record = this.records.find((row) => String(row.id) === key);
    if (!record) throw new Error('Demo record not found');
    Object.assign(record, data);
    return response<T>({ ...record });
  }

  override async delete<T>(url: string): Promise<CoreHttpResponse<T>> {
    const key = url.split('/').pop();
    this.records = this.records.filter((row) => String(row.id) !== key);
    return response<T>({});
  }
}
