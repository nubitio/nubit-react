import type { ReactElement, ReactNode } from 'react';
import { Route } from 'react-router-dom';

/**
 * Wires the two React Router v6 routes a page-mode resource needs:
 * the list route and the record route (`/sales` and `/sales/:id`, where
 * `:id` is also matched by the literal `new` for the create form).
 *
 * React Router v6 has no optional params (`:id?`), so page mode
 * (`viewMode: 'page'` + `routing: { routeParam: 'id' }`) requires both
 * routes to render the same element. This helper returns them in one call:
 *
 * ```tsx
 * <Routes>
 *   {crudRoute('/sales', <SalesPage />)}
 *   {crudRoute('/purchases', <PurchasesPage />, 'purchaseId')}
 * </Routes>
 * ```
 *
 * @param path - The list path, e.g. `/sales`.
 * @param element - The page element (typically a `SmartCrudPage` wrapper).
 * @param routeParam - Param name used in `routing.routeParam`. Default `'id'`.
 */
export function crudRoute(path: string, element: ReactNode, routeParam = 'id'): ReactElement[] {
  const base = path.replace(/\/+$/, '');

  return [
    <Route key={base} path={base} element={element} />,
    <Route key={`${base}/:${routeParam}`} path={`${base}/:${routeParam}`} element={element} />,
  ];
}
