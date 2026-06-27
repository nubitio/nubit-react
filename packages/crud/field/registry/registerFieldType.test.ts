import { describe, expect, it } from 'vitest';
import { textTypeModule } from './types/text';
import { getFieldTypeModule, listRegisteredFieldTypes, registerFieldType } from './registry';
import { FieldType } from '../FieldType';

describe('registerFieldType', () => {
  it('registers a custom type and resolves it from the registry', () => {
    registerFieldType('rating', textTypeModule);
    expect(getFieldTypeModule('rating')).toBe(textTypeModule);
    expect(listRegisteredFieldTypes()).toContain('rating');
  });

  it('rejects overriding built-in FieldType values', () => {
    expect(() => registerFieldType(FieldType.TEXT, textTypeModule)).toThrow(/built-in/);
  });
});