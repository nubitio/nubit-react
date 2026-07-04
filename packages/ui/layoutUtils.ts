export type SpaceScale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around';

export function joinClasses(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function gapClass(prefix: string, gap?: SpaceScale): string {
  return gap ? `${prefix}--gap-${gap}` : '';
}

export function colSpanClasses(
  span?: ColSpan,
  spanSm?: ColSpan,
  spanMd?: ColSpan,
  spanLg?: ColSpan,
): string[] {
  const classes = ['nb-col'];
  if (span != null) classes.push(`nb-col--span-${span}`);
  if (spanSm != null) classes.push(`nb-col--span-sm-${spanSm}`);
  if (spanMd != null) classes.push(`nb-col--span-md-${spanMd}`);
  if (spanLg != null) classes.push(`nb-col--span-lg-${spanLg}`);
  return classes;
}