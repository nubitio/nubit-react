export function resolvePath(source: unknown, path?: string): unknown {
  if (path === undefined || path === '') return source;
  if (source === null || source === undefined) return undefined;

  return path.split('.').reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}

export function resolveArray(source: unknown, path: string): Record<string, unknown>[] {
  const value = resolvePath(source, path);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object');
}