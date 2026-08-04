export type ApiViolation = {
  propertyPath?: string;
  message?: string;
};

export type DetailFieldErrors = Record<number, Record<string, string>>;

export interface MappedApiViolations {
  fieldErrors: Record<string, string>;
  detailErrors: DetailFieldErrors;
  unassigned: string[];
}

function normalizePath(path: string): string {
  return path
    .replace(/^children\[([^\]]+)\]\.data$/, '$1')
    .replace(/^children\[([^\]]+)\]$/, '$1')
    .replace(/^\[([^\]]+)\]$/, '$1')
    .replace(/\[(\w+)\]/g, '.$1')
    .replace(/^\./, '');
}

function readViolation(value: unknown): ApiViolation | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const propertyPath = typeof record['propertyPath'] === 'string' ? record['propertyPath'] : undefined;
  const message = typeof record['message'] === 'string' ? record['message'] : undefined;
  if (!propertyPath && !message) return null;
  return { propertyPath, message };
}

/**
 * Extracts a human-readable message from an API Platform error response body.
 *
 * Two distinct error shapes reach the client:
 *  1. Symfony validation failures — a `violations: [{ propertyPath, message }]`
 *     array, handled entirely by {@link mapApiViolations}.
 *  2. Everything else API Platform can throw as a JSON-LD `Error`/`hydra:Error`
 *     resource — domain exceptions (`ComplianceChecker::assertVigente`), type
 *     mismatches (wrong payload shape for a collection relation), FK
 *     constraint violations surfaced as 409 Conflict, etc. These carry no
 *     `violations` array, only a `detail` (preferred, API Platform's
 *     human-readable message) or `title`/`hydra:description` fallback.
 *
 * Without this, shape (2) errors have no textual representation anywhere in
 * the response and are silently dropped by callers that only look for
 * `violations` (see `useFormSubmit.handleSave` / `handleDelete`).
 *
 * Returns `undefined` when `data` isn't an object or carries none of the
 * known message fields, so callers can fall back to a generic translation.
 */
export function extractApiErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const detail = record['detail'];
  if (typeof detail === 'string' && detail.trim() !== '') return detail;
  const title = record['title'];
  if (typeof title === 'string' && title.trim() !== '') return title;
  const description = record['hydra:description'] ?? record['description'];
  if (typeof description === 'string' && description.trim() !== '') return description;
  return undefined;
}

export function mapApiViolations(
  violations: unknown,
  detailPropertyName = 'items',
  defaultMessage = 'Invalid value',
): MappedApiViolations {
  const fieldErrors: Record<string, string> = {};
  const detailErrors: DetailFieldErrors = {};
  const unassigned: string[] = [];

  if (!Array.isArray(violations)) {
    return { fieldErrors, detailErrors, unassigned };
  }

  violations.forEach((item) => {
    const violation = readViolation(item);
    if (!violation) return;

    const message = violation.message ?? defaultMessage;
    const path = violation.propertyPath ? normalizePath(violation.propertyPath) : '';
    if (!path) {
      unassigned.push(message);
      return;
    }

    const parts = path.split('.').filter(Boolean);
    if (parts[0] === detailPropertyName && /^\d+$/.test(parts[1] ?? '') && parts[2]) {
      const rowIndex = Number(parts[1]);
      const fieldName = parts.slice(2).join('.');
      detailErrors[rowIndex] = { ...detailErrors[rowIndex], [fieldName]: message };
      return;
    }

    fieldErrors[path] = message;
  });

  return { fieldErrors, detailErrors, unassigned };
}
