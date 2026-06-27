import type { Field } from '@nubitio/crud';

const BUILDER_BY_TYPE: Record<string, string> = {
  text: 'textField',
  password: 'passwordField',
  textarea: 'textareaField',
  date: 'dateField',
  datetime: 'datetimeField',
  number: 'numberField',
  currency: 'currencyField',
  select: 'selectField',
  enum: 'enumField',
  entity: 'entityField',
  radio: 'radioField',
  switch: 'switchField',
  checkbox: 'checkboxField',
  file: 'fileField',
  image: 'imageField',
  tags: 'tagsField',
  html: 'htmlField',
  none: 'noneField',
};

export function fieldToCodeLine(field: Field): string {
  const builder = BUILDER_BY_TYPE[field.type] ?? 'textField';
  const parts: string[] = [];

  if (builder === 'entityField' && field.url) {
    parts.push(
      `${builder}('${field.url}', '${field.valueField || '_iri'}', '${field.textField || 'name'}')`,
    );
  } else if (builder === 'enumField' && field.data.length > 0) {
    const options = field.data
      .map((opt) => `{ value: ${JSON.stringify(opt.value)}, text: ${JSON.stringify(opt.text)} }`)
      .join(', ');
    parts.push(`${builder}([${options}])`);
  } else if (builder === 'fileField' || builder === 'imageField') {
    parts.push(`${builder}('${field.url ?? '/api/media'}')`);
  } else {
    parts.push(`${builder}()`);
  }

  let chain = parts[0] + `.name('${field.name}').label(${JSON.stringify(field.label)})`;
  if (field.required) chain += '.required(true)';
  if (field.readonly) chain += '.readonly(true)';
  if (field.precision !== undefined && field.type === 'number') {
    chain += `.precision(${field.precision})`;
  }
  chain += '.build()';
  return `    ${chain},`;
}

export function renderFieldsModule(apiUrl: string, fields: Field[]): string {
  const hintable = fields.filter((f) => !f.isIdentity);
  const imports = new Set(['defineResource']);
  for (const field of hintable) {
    const builder = BUILDER_BY_TYPE[field.type] ?? 'textField';
    imports.add(builder);
  }

  return `import { ${[...imports].join(', ')} } from '@nubitio/react-admin';

/** Ejected from ${apiUrl} — ${new Date().toISOString()} */
export const resource = defineResource('${apiUrl}', {
  fields: [
${hintable.map(fieldToCodeLine).join('\n')}
  ],
});
`;
}

export function renderPageModule(componentName: string, apiUrl: string, title: string): string {
  return `import { SmartCrudPage, defineResource } from '@nubitio/react-admin';

const resource = defineResource('${apiUrl}', {
  title: ${JSON.stringify(title)},
});

export function ${componentName}() {
  return <SmartCrudPage resource={resource} />;
}
`;
}