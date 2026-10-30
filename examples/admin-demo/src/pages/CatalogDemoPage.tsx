import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button, EmptyState } from '@nubitio/ui';
import {
  CrudPage,
  ResourceStoreProvider,
  RestAdapter,
  defineResource,
  identityField,
  textField,
  numberField,
  enumField,
  switchField,
  type CardViewContext,
} from '@nubitio/react-admin';
import { CoreHttpProvider } from '@nubitio/core';
import { CatalogDemoClient } from './catalogDemoStore';
import './CatalogDemoPage.scss';

function CatalogCard({ row }: CardViewContext) {
  return (
    <span className="catalog-demo-card">
      <strong>{String(row.name)}</strong>
      <span>
        {String(row.sku)} · {String(row.category)}
      </span>
      <strong>${Number(row.price).toFixed(2)}</strong>
      <span>{Number(row.stock) === 0 ? 'Out of stock' : `${String(row.stock)} available`}</span>
    </span>
  );
}

const catalog = defineResource('/demo/products', {
  title: 'Catalog demo',
  gridAppearance: 'page',
  quickFilterFields: ['category'],
  adapter: RestAdapter,
  mercure: false,
  viewMode: 'page',
  fields: [
    identityField().build(),
    textField()
      .name('name')
      .label('Product name')
      .required(true)
      .filterable(true)
      .sortable(true)
      .layoutHint('fullWidth')
      .build(),
    textField().name('sku').label('SKU').layoutHint('short').build(),
    enumField([
      { value: 'Accessories', text: 'Accessories' },
      { value: 'Office', text: 'Office' },
    ])
      .name('category')
      .label('Category')
      .filterable(true)
      .layoutHint('short')
      .build(),
    numberField().name('price').label('Price').required(true).layoutHint('money').build(),
    numberField().name('cost').label('Cost').layoutHint('money').build(),
    numberField().name('stock').label('Stock').layoutHint('short').build(),
    switchField().name('active').label('Active').build(),
    textField().name('notes').label('Notes').layoutHint('fullWidth').build(),
  ],
  cardView: {
    defaultView: 'cards',
    renderContent: (context) => <CatalogCard {...context} />,
    renderMedia: () => <i className="ph ph-package" aria-hidden="true" />,
  },
  formLayout: {
    type: 'columns',
    main: [
      {
        label: 'General',
        description: 'How this item appears in the catalog.',
        fields: ['name', 'sku', 'category'],
      },
      {
        label: 'Pricing',
        fields: ['price', 'cost'],
        renderAfter: (data) => (
          <p className="catalog-demo-summary" role="status">
            Difference per unit: ${(Number(data.price ?? 0) - Number(data.cost ?? 0)).toFixed(2)}
          </p>
        ),
      },
      { label: 'Inventory', fields: ['stock', 'notes'] },
    ],
    aside: [
      { label: 'Availability', description: 'Used only by this local demo.', fields: ['active'] },
    ],
  },
  formPage: {
    titles: { add: 'New product', edit: 'Edit product', view: 'View product' },
    subtitle: 'Catalog · Product details',
    saveLabel: 'Save product',
    footerContent: 'Demo data · Changes are kept in memory only. No automatic drafts.',
  },
  emptyState: {
    render: ({ onAdd }) => (
      <EmptyState
        title="Start your catalog"
        description="Create an item to see it here."
        size="lg"
        action={onAdd && <Button onClick={onAdd}>Create item</Button>}
      />
    ),
  },
});

export function CatalogDemoPage() {
  const [params] = useSearchParams();
  const [client] = useState(() => new CatalogDemoClient(params.get('catalogState') ?? 'normal'));
  const { id } = useParams();
  return (
    <CoreHttpProvider client={client}>
      <ResourceStoreProvider factory={client.factory}>
        <CrudPage
          resource={
            client.scenario === 'readonly'
              ? {
                  ...catalog,
                  permissions: { canView: true, canAdd: false, canEdit: false, canDelete: false },
                }
              : catalog
          }
          initialIsNew={id === 'new'}
          initialRecordId={id && id !== 'new' ? id : null}
        />
      </ResourceStoreProvider>
    </CoreHttpProvider>
  );
}
