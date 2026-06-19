/**
 * Builds a formDetail reload URL for {@code #[EmbeddedLines]} line entities.
 *
 * @example embeddedLinesUrl('/api/sales_document_lines', 'document')
 *          → '/api/sales_document_lines?document={id}'
 */
export function embeddedLinesUrl(route: string, parentQueryParam: string): string {
  const separator = route.includes('?') ? '&' : '?';

  return `${route}${separator}${parentQueryParam}={id}`;
}