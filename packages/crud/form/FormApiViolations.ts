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
