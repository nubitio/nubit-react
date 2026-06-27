import { isDevEnvironment } from './devHint';

const warned = new Set<string>();

export function warnOnce(key: string, message: string): void {
  if (!isDevEnvironment() || warned.has(key)) return;
  warned.add(key);
  console.warn(`[Nubit] ${message}`);
}