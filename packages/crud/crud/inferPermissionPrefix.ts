/**
 * `/api/invoices` → `invoice`, `/api/sales-documents` → `sales_document`.
 *
 * Used when `defineResource` does not set `permissionPrefix` so the toolbar
 * can follow `/api/me` permissions without every page repeating the name.
 */
export function inferPermissionPrefix(apiUrl: string | undefined): string {
  if (!apiUrl) {
    return '';
  }

  const segment = apiUrl.replace(/\/+$/, '').split('/').filter(Boolean).pop() ?? '';
  const name = segment.replace(/-/g, '_');

  if (name.endsWith('ies') && name.length > 3) {
    return name.slice(0, -3) + 'y';
  }

  if (
    name.endsWith('ses') ||
    name.endsWith('xes') ||
    name.endsWith('zes') ||
    name.endsWith('ches') ||
    name.endsWith('shes')
  ) {
    return name.replace(/es$/, '');
  }

  if (name.endsWith('s') && !name.endsWith('ss')) {
    return name.slice(0, -1);
  }

  return name;
}
