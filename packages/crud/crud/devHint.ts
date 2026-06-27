/**
 * devHint — logs a `defineResource(...)` snippet to the console in development
 * mode when SmartCrudPage has auto-inferred fields from the Hydra API doc.
 *
 * Rules:
 *  - Only runs on local development hostnames (localhost, 127.0.0.1, *.localhost,
 *    192.168.x.x). This runtime check replaces `import.meta.env.DEV` so the hint
 *    fires even when Vite builds a production bundle but Symfony's APP_ENV is
 *    "dev" (i.e. the Vite dev server is not wired up and DEV is always false).
 *  - Fires at most once per resource URL across the entire app lifetime
 *    (module-level Set prevents duplicate logs on re-renders or StrictMode
 *    double-invocation).
 *  - Uses `console.info` prefixed with `[SmartCRUD]`.
 *  - Is a no-op on non-local hostnames (e.g. staging, production).
 */

import type { Field } from '../field/Field';

const loggedUrls = new Set<string>();

/**
 * Returns true when running on a local development hostname.
 * Works regardless of Vite build mode (`import.meta.env.DEV`).
 */
export function isDevEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.localhost') ||
    host.startsWith('192.168.')
  );
}

/**
 * Derives a one-line field descriptor string for use in the hint snippet.
 * Produces e.g. `{ key: 'name', label: 'Name', type: 'text' }`.
 */
function fieldToHintLine(field: Field): string {
  const readOnlyPart = field.readonly ? ', readOnly: true' : '';
  return `    { key: '${field.name}', label: '${field.label}', type: '${field.type}'${readOnlyPart} },`;
}

function fieldMappingLine(field: Field): string {
  const reason = field.mappingReason ?? 'manual/unknown';
  return `  ${field.name.padEnd(20)} ${field.type.padEnd(10)} ← ${reason}`;
}

/**
 * Log a dev hint for auto-inferred fields the first time a resource URL is
 * mounted with auto-discovery active.
 *
 * @param resourceUrl - The `apiUrl` passed to SmartCrudPage (normalized form).
 * @param fields      - The auto-inferred `Field[]` resolved by useResourceSchema.
 * @param operations  - The inferred HTTP methods exposed by the resource.
 */
export function logDevHint(resourceUrl: string, fields: Field[], operations: string[] = []): void {
  if (!isDevEnvironment()) return;
  if (loggedUrls.has(resourceUrl)) return;
  loggedUrls.add(resourceUrl);

  const hintableFields = fields.filter((f) => !f.isIdentity);
  const fieldLines = hintableFields.map(fieldToHintLine).join('\n');
  const mappingLines = hintableFields.map(fieldMappingLine).join('\n');

  const operationsLine =
    operations.length > 0
      ? `  operations: [${operations.join(', ')}],
`
      : '';

  console.info(
    `[SmartCRUD] Auto-inferred fields for "${resourceUrl}".\n\n` +
      `Mapping (rule → x-crud):\n${mappingLines}\n\n` +
      `To customise, use:\n\n` +
      `defineResource('${resourceUrl}', {\n` +
      operationsLine +
      `  fields: [\n` +
      `${fieldLines}\n` +
      `  ]\n` +
      `})`,
  );
}