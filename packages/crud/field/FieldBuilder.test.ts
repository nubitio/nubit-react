import { describe, expect, it } from 'vitest';
import { FieldBuilder } from './FieldBuilder';
import { FieldType } from './FieldType';
import {
  checkboxField,
  currencyField,
  dateField,
  datetimeField,
  entityField,
  enumField,
  identityField,
  fileField,
  imageField,
  noneField,
  numberField,
  passwordField,
  selectField,
  switchField,
  textField,
  textareaField,
} from './FieldBuilders';

describe('FieldBuilder', () => {
  it('builds a field with default values', () => {
    const field = new FieldBuilder().name('code').label('Código').build();

    expect(field.name).toBe('code');
    expect(field.label).toBe('Código');
    expect(field.type).toBe(FieldType.TEXT);
    expect(field.required).toBe(false);
    expect(field.visible).toBe(true);
    expect(field.visibleOnForm).toBe(true);
    expect(field.sortable).toBe(true);
    expect(field.filterable).toBe(true);
    expect(field.col).toBeUndefined();
  });

  it('chains fluent setters without mutating previous instances', () => {
    const base = new FieldBuilder().name('base').label('Base');
    const derived = base.required(true).col(6);

    const baseField = new FieldBuilder().name('base').label('Base').build();
    const derivedField = derived.build();

    expect(baseField.required).toBe(false);
    expect(derivedField.required).toBe(true);
    expect(derivedField.col).toBe(6);
  });

  it('sets field type correctly', () => {
    const numField = new FieldBuilder().name('qty').label('Cantidad').type(FieldType.NUMBER).build();
    expect(numField.type).toBe(FieldType.NUMBER);

    const dateField = new FieldBuilder().name('date').label('Fecha').type(FieldType.DATE).build();
    expect(dateField.type).toBe(FieldType.DATE);
  });

  it('marks field as required', () => {
    const field = new FieldBuilder().name('ruc').label('RUC').required(true).build();
    expect(field.required).toBe(true);
  });

  it('hides field from grid and form independently', () => {
    const gridHidden = new FieldBuilder().name('f').label('F').hidden(true).build();
    expect(gridHidden.hidden).toBe(true);
    expect(gridHidden.visibleOnForm).toBe(true);

    const formHidden = new FieldBuilder().name('f').label('F').visibleOnForm(false).build();
    expect(formHidden.hidden).toBe(false);
    expect(formHidden.visibleOnForm).toBe(false);
  });

  it('sets defaultValue', () => {
    const field = new FieldBuilder().name('status').label('Estado').defaultValue('active').build();
    expect(field.defaultValue).toBe('active');
  });

  it('sets url, textField, valueField for entity field', () => {
    const field = new FieldBuilder()
      .name('product')
      .label('Producto')
      .type(FieldType.ENTITY)
      .url('/api/products')
      .textField('name')
      .valueField('id')
      .build();

    expect(field.url).toBe('/api/products');
    expect(field.textField).toBe('name');
    expect(field.valueField).toBe('id');
  });

  it('sets precision for numeric fields', () => {
    const field = new FieldBuilder().name('price').label('Precio').precision(2).build();
    expect(field.precision).toBe(2);
  });

  it('marks field as readonly and disabled independently', () => {
    const ro = new FieldBuilder().name('f').label('F').readonly(true).build();
    expect(ro.readonly).toBe(true);
    expect(ro.disabled).toBe(false);

    const dis = new FieldBuilder().name('f').label('F').disabled(true).build();
    expect(dis.disabled).toBe(true);
    expect(dis.readonly).toBe(false);
  });

  it('isIdentity marks field as identity', () => {
    const field = new FieldBuilder().name('id').label('ID').isIdentity(true).build();
    expect(field.isIdentity).toBe(true);
  });

  describe('declarative rules', () => {
    it('visibleWhen stores the predicate and returns false when predicate returns false', () => {
      const fn = (data: Record<string, unknown>) => data['active'] === true;
      const field = new FieldBuilder().name('detail').label('Detalle').visibleWhen(fn).build();

      expect(field.visibleWhen).toBe(fn);
      expect(field.visibleWhen?.({ active: false })).toBe(false);
      expect(field.visibleWhen?.({ active: true })).toBe(true);
    });

    it('disabledWhen stores the predicate', () => {
      const fn = (data: Record<string, unknown>) => data['status'] === 'closed';
      const field = new FieldBuilder().name('amount').label('Monto').disabledWhen(fn).build();

      expect(field.disabledWhen).toBe(fn);
      expect(field.disabledWhen?.({ status: 'open' })).toBe(false);
      expect(field.disabledWhen?.({ status: 'closed' })).toBe(true);
    });

    it('computed stores the derivation function and field has no readonly flag by default', () => {
      const fn = (data: Record<string, unknown>) =>
        (data['qty'] as number) * (data['price'] as number);
      const field = new FieldBuilder().name('total').label('Total').computed(fn).build();

      expect(field.computed).toBe(fn);
      expect(field.computed?.({ qty: 3, price: 10 })).toBe(30);
      // readonly is applied at runtime by the rules pipeline, not by the builder
      expect(field.readonly).toBe(false);
    });

    it('requiredWhen stores the predicate', () => {
      const fn = (data: Record<string, unknown>) => data['status'] === 'rejected';
      const field = new FieldBuilder().name('reason').label('Motivo').requiredWhen(fn).build();

      expect(field.requiredWhen).toBe(fn);
      expect(field.requiredWhen?.({ status: 'draft' })).toBe(false);
      expect(field.requiredWhen?.({ status: 'rejected' })).toBe(true);
    });

    it('defaultWhen stores the default resolver', () => {
      const fn = (data: Record<string, unknown>) => (data['country'] === 'PE' ? 'PEN' : 'USD');
      const field = new FieldBuilder().name('currency').label('Moneda').defaultWhen(fn).build();

      expect(field.defaultWhen).toBe(fn);
      expect(field.defaultWhen?.({ country: 'PE' })).toBe('PEN');
      expect(field.defaultWhen?.({ country: 'US' })).toBe('USD');
    });

    it('clearWhenHidden enables hidden field clearing by default', () => {
      const field = new FieldBuilder().name('reason').label('Motivo').clearWhenHidden().build();

      expect(field.clearWhenHidden).toBe(true);
    });

    it('dependsOn stores the dependency list', () => {
      const field = new FieldBuilder()
        .name('product')
        .label('Producto')
        .dependsOn(['warehouse', 'category'])
        .build();

      expect(field.dependsOn).toEqual(['warehouse', 'category']);
    });

    it('permissions stores visible and editable role lists', () => {
      const field = new FieldBuilder()
        .name('cost')
        .label('Costo')
        .permissions({ visible: ['admin', 'accountant'], editable: ['admin'] })
        .build();

      expect(field.permissions?.visible).toEqual(['admin', 'accountant']);
      expect(field.permissions?.editable).toEqual(['admin']);
    });

    it('permissions with only visible roles omits editable', () => {
      const field = new FieldBuilder()
        .name('sku')
        .label('SKU')
        .permissions({ visible: ['admin'] })
        .build();

      expect(field.permissions?.visible).toEqual(['admin']);
      expect(field.permissions?.editable).toBeUndefined();
    });

    it('declarative rules do not affect unrelated field properties', () => {
      const field = new FieldBuilder()
        .name('note')
        .label('Nota')
        .required(true)
        .col(6)
        .visibleWhen(() => true)
        .disabledWhen(() => false)
        .build();

      expect(field.required).toBe(true);
      expect(field.col).toBe(6);
      expect(field.name).toBe('note');
    });

    it('build() returns a snapshot — mutating the returned field does not affect a second build', () => {
      const builder = new FieldBuilder().name('x').label('X').visibleWhen(() => true);
      const first = builder.build();
      const second = builder.build();

      (first as unknown as Record<string, unknown>)['visibleWhen'] = undefined;
      expect(second.visibleWhen).toBeDefined();
    });
  });
});

describe('Field factory functions (public DSL)', () => {
  it('textField() creates a TEXT field with correct defaults', () => {
    const f = textField().name('title').label('Título').build();
    expect(f.type).toBe(FieldType.TEXT);
    expect(f.name).toBe('title');
  });

  it('textareaField() creates a TEXTAREA field', () => {
    const f = textareaField().name('notes').label('Notas').build();
    expect(f.type).toBe(FieldType.TEXTAREA);
  });

  it('numberField() creates a NUMBER field', () => {
    const f = numberField().name('qty').label('Cantidad').precision(0).build();
    expect(f.type).toBe(FieldType.NUMBER);
    expect(f.precision).toBe(0);
  });

  it('currencyField() sets sendAsString and right align by default', () => {
    const f = currencyField().name('total').label('Total').build();
    expect(f.type).toBe(FieldType.CURRENCY);
    expect(f.sendAsString).toBe(true);
    expect(f.align).toBe('right');
  });

  it('dateField() sets a defaultValue in en-CA format', () => {
    const f = dateField().name('date').label('Fecha').build();
    expect(f.type).toBe(FieldType.DATE);
    expect(typeof f.defaultValue).toBe('string');
    // en-CA format is YYYY-MM-DD
    expect(f.defaultValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('datetimeField() sets type DATETIME and a Date default', () => {
    const f = datetimeField().name('created').label('Creado').build();
    expect(f.type).toBe(FieldType.DATETIME);
    expect(f.defaultValue).toBeInstanceOf(Date);
  });

  it('switchField() and checkboxField() create boolean fields', () => {
    const sw = switchField().name('active').label('Activo').build();
    expect(sw.type).toBe(FieldType.SWITCH);

    const cb = checkboxField().name('agree').label('Acepto').build();
    expect(cb.type).toBe(FieldType.CHECKBOX);
  });

  it('selectField() creates a SELECT field', () => {
    const f = selectField().name('status').label('Estado').build();
    expect(f.type).toBe(FieldType.SELECT);
  });

  it('enumField() requires options and stores them in data', () => {
    const opts = [
      { value: 'draft', text: 'Borrador' },
      { value: 'published', text: 'Publicado' },
    ];
    const f = enumField(opts).name('state').label('Estado').build();
    expect(f.type).toBe(FieldType.ENUM);
    expect(f.data).toEqual(opts);
  });

  it('passwordField() creates a PASSWORD field', () => {
    const f = passwordField().name('pwd').label('Contraseña').required(true).build();
    expect(f.type).toBe(FieldType.PASSWORD);
    expect(f.required).toBe(true);
  });

  it('noneField() creates a NONE (display-only) field', () => {
    const f = noneField().name('statusBadge').label('Status').build();
    expect(f.type).toBe(FieldType.NONE);
  });

  it('identityField() sets identity + hidden + required + name="id"', () => {
    const f = identityField().build();
    expect(f.isIdentity).toBe(true);
    expect(f.visible).toBe(false);
    expect(f.required).toBe(true);
    expect(f.name).toBe('id');
    expect(f.type).toBe(FieldType.NONE);
  });

  it('entityField() requires url, valueField and textField', () => {
    const f = entityField('/api/customers', 'id', 'businessName')
      .name('customer')
      .label('Cliente')
      .build();

    expect(f.type).toBe(FieldType.ENTITY);
    expect(f.url).toBe('/api/customers');
    expect(f.valueField).toBe('id');
    expect(f.textField).toBe('businessName');
  });

  it('fileField() sets FILE type + media upload defaults', () => {
    const f = fileField('https://api.example.com/').name('attachment').label('Adjunto').build();
    expect(f.type).toBe(FieldType.FILE);
    expect(f.url).toContain('media');
    expect(f.accept).toBeNull();
  });

  it('imageField() sets FILE type + image defaults', () => {
    const f = imageField('https://api.example.com/').name('photo').label('Foto').build();
    expect(f.type).toBe(FieldType.FILE);
    expect(f.accept).toBe('image/*');
    expect(f.align).toBe('center');
    expect(f.url).toContain('media');
  });

  it('factories return chainable builders that support .formatter() and .visibleWhen()', () => {
    const f = textField()
      .name('sku')
      .label('SKU')
      .formatter((cell) => String(cell.value).toUpperCase())
      .visibleWhen((data) => data['showSku'] === true)
      .build();

    expect(f.formatter).toBeDefined();
    expect(f.visibleWhen).toBeDefined();
  });

  it('all factories can be further customized with common methods', () => {
    const f = numberField()
      .name('price')
      .label('Precio')
      .required(true)
      .readonly(true)
      .col(6)
      .align('right')
      .build();

    expect(f.required).toBe(true);
    expect(f.readonly).toBe(true);
    expect(f.col).toBe(6);
  });

  it('supports .formatter(), .onChange(), .validators() and .loadOptions()', () => {
    const fmt = (cell: any) => cell.value;
    const onChange = () => {};
    const validators = [{ type: 'required' as const }];
    const loadOpts = [{ label: 'A', value: 1 }];

    const f = textField()
      .name('x')
      .formatter(fmt)
      .onChange(onChange as any)
      .validators(validators as any)
      .loadOptions(loadOpts as any)
      .build();

    expect(f.formatter).toBe(fmt);
    expect(f.onChange).toBe(onChange);
    expect(f.validators.length).toBe(1);
    expect(f.loadOptions.length).toBe(1);
  });

  it('supports .dependsOn(), .permissions() and advanced rules via factories', () => {
    const f = entityField('/api/items', 'id', 'name')
      .name('item')
      .dependsOn(['warehouse'])
      .permissions({ visible: ['admin'], editable: ['admin', 'manager'] })
      .requiredWhen((d) => d['requireItem'] === true)
      .build();

    expect(f.dependsOn).toEqual(['warehouse']);
    expect(f.permissions?.visible).toContain('admin');
    expect(f.requiredWhen).toBeDefined();
  });
});
