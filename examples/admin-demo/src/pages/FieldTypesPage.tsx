import {
  CrudPage,
  ResourceStoreProvider,
  RestAdapter,
  checkboxField,
  currencyField,
  dateField,
  defineResource,
  enumField,
  identityField,
  numberField,
  textField,
} from '@nubitio/react-admin';

/**
 * Smoke page for the Field-Type registry: every common FieldType in one
 * grid/form, backed by an in-memory store (no backend required).
 */
const SEED = [
  { id: 1, name: 'Laptop', qty: 3, price: 1234.5, soldOn: '2026-05-01', status: 'open', active: true },
  { id: 2, name: 'Mouse', qty: 12, price: 25.99, soldOn: '2026-05-12', status: 'closed', active: false },
  { id: 3, name: 'Monitor', qty: 5, price: 349, soldOn: '2026-06-01', status: 'open', active: true },
];

const memoryStore = () => ({
  load: async () => ({ data: SEED, totalCount: SEED.length }),
});

const sales = defineResource('/sales', {
  title: 'Field Types',
  adapter: RestAdapter,
  mercure: false,
  fields: [
    identityField().build(),
    textField().name('name').label('Name').build(),
    numberField().name('qty').label('Quantity').build(),
    currencyField().name('price').label('Price').build(),
    dateField().name('soldOn').label('Sold on').build(),
    enumField([
      { value: 'open', text: 'Open' },
      { value: 'closed', text: 'Closed' },
    ])
      .name('status')
      .label('Status')
      .build(),
    checkboxField().name('active').label('Active').build(),
  ],
});

export function FieldTypesPage() {
  return (
    <ResourceStoreProvider factory={memoryStore}>
      <CrudPage resource={sales} />
    </ResourceStoreProvider>
  );
}
