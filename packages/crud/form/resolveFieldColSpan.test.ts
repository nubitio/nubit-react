import { describe, expect, it } from 'vitest';
import { FieldType } from '../field/FieldType';
import type { Field } from '../field/Field';
import {
  buildFieldColSpanContext,
  isLongTextField,
  isShortField,
  resolveDrawerSize,
  resolveFieldColSpan,
  resolveFieldsColSpans,
} from './resolveFieldColSpan';

function field(partial: Partial<Field>): Field {
  return {
    isIdentity: false,
    type: FieldType.TEXT,
    col: undefined,
    name: 'field',
    label: 'Field',
    width: undefined,
    height: null,
    minWidth: undefined,
    align: 'left',
    sortable: true,
    filterable: true,
    hideable: true,
    validators: [],
    url: undefined,
    loadOptions: [],
    filters: [],
    byKeyUrl: null,
    textField: '',
    valueField: '',
    valueType: 'string',
    format: '',
    selectedFilterOperation: undefined,
    filterValue: undefined,
    data: [],
    formatter: undefined,
    itemFormatter: undefined,
    visible: true,
    defaultValue: undefined,
    onChange: undefined,
    onSelect: undefined,
    onClick: undefined,
    readonly: false,
    disabled: false,
    hidden: false,
    required: false,
    precision: 0,
    accept: null,
    buttons: [],
    searchEnabled: true,
    searchExpr: null,
    helpText: undefined,
    contentRender: null,
    visibleOnForm: true,
    maxLength: undefined,
    multiple: false,
    sendAsString: false,
    ...partial,
  };
}

const pageContext = buildFieldColSpanContext({
  presentationMode: 'page',
  viewportWidth: 1280,
});

const drawerLgContext = buildFieldColSpanContext({
  presentationMode: 'drawer',
  drawerWidth: 1120,
  viewportWidth: 1280,
});

const drawerMdContext = buildFieldColSpanContext({
  presentationMode: 'drawer',
  drawerWidth: 640,
  viewportWidth: 1280,
});

const dialogContext = buildFieldColSpanContext({
  presentationMode: 'dialog',
  dialogWidth: 480,
  viewportWidth: 1280,
});

describe('resolveDrawerSize', () => {
  it('maps drawer widths to size buckets', () => {
    expect(resolveDrawerSize(480)).toBe('sm');
    expect(resolveDrawerSize(639)).toBe('sm');
    expect(resolveDrawerSize(640)).toBe('md');
    expect(resolveDrawerSize(879)).toBe('md');
    expect(resolveDrawerSize(880)).toBe('lg');
    expect(resolveDrawerSize(1120)).toBe('xl');
    expect(resolveDrawerSize('min(880px, 60vw)')).toBe('lg');
  });
});

describe('structural field signals', () => {
  it('detects long fields by type, hint, or maxLength only', () => {
    expect(isLongTextField(field({ type: FieldType.TEXTAREA, name: 'notes' }))).toBe(true);
    expect(isLongTextField(field({ layoutHint: 'long', name: 'customField' }))).toBe(true);
    expect(isLongTextField(field({ name: 'bio', maxLength: 120 }))).toBe(true);
    expect(isLongTextField(field({ name: 'code', maxLength: 12 }))).toBe(false);
  });

  it('detects short fields by type, hint, or short maxLength only', () => {
    expect(isShortField(field({ layoutHint: 'identity', name: 'documentNumber' }))).toBe(true);
    expect(isShortField(field({ type: FieldType.DATE, name: 'issuedAt' }))).toBe(true);
    expect(isShortField(field({ name: 'code', maxLength: 12 }))).toBe(true);
    expect(isShortField(field({ name: 'description' }))).toBe(false);
    expect(isShortField(field({ type: FieldType.TEXTAREA, name: 'description' }))).toBe(false);
  });
});

describe('resolveFieldColSpan', () => {
  it('respects explicit col() overrides', () => {
    expect(resolveFieldColSpan(field({ col: 4, name: 'code' }), drawerLgContext)).toBe(4);
  });

  it('forces full width on mobile', () => {
    const mobile = buildFieldColSpanContext({
      presentationMode: 'page',
      viewportWidth: 390,
    });
    expect(resolveFieldColSpan(field({ layoutHint: 'short', name: 'code' }), mobile)).toBe(12);
  });

  it('uses half columns for compact types in drawer lg/page', () => {
    expect(resolveFieldColSpan(field({ type: FieldType.DATE, name: 'issuedAt' }), drawerLgContext)).toBe(6);
    expect(resolveFieldColSpan(field({ type: FieldType.CURRENCY, name: 'amount' }), pageContext)).toBe(6);
  });

  it('defaults plain text fields to full width without layoutHint', () => {
    expect(resolveFieldColSpan(field({ name: 'description' }), drawerLgContext)).toBe(12);
    expect(resolveFieldColSpan(field({ type: FieldType.TEXTAREA, name: 'description' }), pageContext)).toBe(12);
  });

  it('defaults drawer md/dialog to single column', () => {
    expect(resolveFieldColSpan(field({ type: FieldType.DATE, name: 'issuedAt' }), drawerMdContext)).toBe(12);
    expect(resolveFieldColSpan(field({ layoutHint: 'short', name: 'code' }), dialogContext)).toBe(12);
  });

  it('keeps master-detail page forms in a single column', () => {
    const masterDetailPage = buildFieldColSpanContext({
      presentationMode: 'page',
      hasMasterDetail: true,
      viewportWidth: 1280,
    });
    expect(resolveFieldColSpan(field({ type: FieldType.DATE, name: 'issuedAt' }), masterDetailPage)).toBe(12);
    expect(resolveFieldColSpan(field({ layoutHint: 'short', name: 'code' }), masterDetailPage)).toBe(12);
  });

  it('honours layout metadata', () => {
    expect(
      resolveFieldColSpan(
        field({ name: 'custom', layoutHint: 'short', forceFullWidth: true }),
        drawerLgContext,
      ),
    ).toBe(12);
    expect(
      resolveFieldColSpan(
        field({ name: 'custom', layoutHint: 'fullWidth' }),
        drawerLgContext,
      ),
    ).toBe(12);
    expect(
      resolveFieldColSpan(
        field({ name: 'custom', layoutHint: 'short' }),
        drawerLgContext,
      ),
    ).toBe(6);
  });
});

describe('resolveFieldsColSpans orphan handling', () => {
  it('expands a trailing half-column orphan to full width', () => {
    const spans = resolveFieldsColSpans(
      [
        field({ layoutHint: 'short', name: 'phone' }),
        field({ layoutHint: 'short', name: 'email' }),
        field({ layoutHint: 'lookup', name: 'priceList', type: FieldType.ENTITY, textField: 'name', valueField: 'id' }),
      ],
      drawerLgContext,
    );

    expect(spans.get('phone')).toBe(6);
    expect(spans.get('email')).toBe(6);
    expect(spans.get('priceList')).toBe(12);
  });

  it('keeps valid pairs untouched', () => {
    const spans = resolveFieldsColSpans(
      [
        field({ layoutHint: 'identity', name: 'documentNumber' }),
        field({ layoutHint: 'medium', name: 'displayName' }),
      ],
      drawerLgContext,
    );

    expect(spans.get('documentNumber')).toBe(6);
    expect(spans.get('displayName')).toBe(6);
  });
});

describe('layoutHint-driven layouts', () => {
  it('lays out a typical form when hints declare field intent', () => {
    const spans = resolveFieldsColSpans(
      [
        field({ layoutHint: 'identity', name: 'documentNumber' }),
        field({ layoutHint: 'medium', name: 'displayName' }),
        field({ layoutHint: 'long', name: 'address' }),
        field({ layoutHint: 'short', name: 'phone' }),
        field({ layoutHint: 'short', name: 'email' }),
        field({ layoutHint: 'lookup', name: 'priceList', type: FieldType.ENTITY, textField: 'name', valueField: 'id' }),
      ],
      drawerLgContext,
    );

    expect(spans.get('documentNumber')).toBe(6);
    expect(spans.get('displayName')).toBe(6);
    expect(spans.get('address')).toBe(12);
    expect(spans.get('phone')).toBe(6);
    expect(spans.get('email')).toBe(6);
    expect(spans.get('priceList')).toBe(12);
  });

  it('pairs compact types and expands declared long fields', () => {
    const spans = resolveFieldsColSpans(
      [
        field({ layoutHint: 'short', name: 'code', maxLength: 12 }),
        field({ layoutHint: 'lookup', name: 'category', type: FieldType.ENTITY, textField: 'name', valueField: 'id' }),
        field({ layoutHint: 'fullWidth', name: 'title' }),
        field({ layoutHint: 'money', name: 'salePrice', type: FieldType.CURRENCY }),
        field({ layoutHint: 'money', name: 'purchasePrice', type: FieldType.CURRENCY }),
        field({ type: FieldType.TEXTAREA, name: 'description' }),
        field({ layoutHint: 'upload', name: 'photo', type: FieldType.FILE }),
      ],
      drawerLgContext,
    );

    expect(spans.get('code')).toBe(6);
    expect(spans.get('category')).toBe(6);
    expect(spans.get('title')).toBe(12);
    expect(spans.get('salePrice')).toBe(6);
    expect(spans.get('purchasePrice')).toBe(6);
    expect(spans.get('description')).toBe(12);
    expect(spans.get('photo')).toBe(12);
  });
});