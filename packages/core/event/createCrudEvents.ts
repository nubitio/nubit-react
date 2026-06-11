/**
 * Generic factory that builds a typed set of CRUD event name strings for a
 * given `prefix`.  The returned object is `const`-asserted so every value is
 * a template-literal type — callers get full type inference without having to
 * cast anything.
 *
 * This helper belongs in `core/` because it has no feature-specific logic; it
 * is used by both the core event bus and by every feature module that needs
 * its own event namespace.
 *
 * @example
 * const productEvents = createCrudEvents('product');
 * // productEvents.ADD === 'product:add'
 */
export const createCrudEvents = <TPrefix extends string>(prefix: TPrefix) =>
  ({
    ADD: `${prefix}:add`,
    EDIT: `${prefix}:edit`,
    DELETE: `${prefix}:delete`,
    SAVE: `${prefix}:save`,
    CANCEL: `${prefix}:cancel`,
    SUCCESS: `${prefix}:success`,
    LOADING: `${prefix}:loading`,
  }) as const;
