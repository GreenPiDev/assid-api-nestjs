import { SECTORS } from '../constants/sector.constant';

/**
 * Regex-based case-insensitive matching breaks on Turkish text (the
 * dotted İ / dotless ı pair doesn't case-fold against ASCII i/I under a
 * plain 'i' regex flag). Node ships with full ICU, so locale-aware
 * lowercasing gives correct matching instead.
 */
export function normalizeTr(text: string): string {
  return (text || '').toLocaleLowerCase('tr-TR').trim();
}

export function textIncludes(haystack: string | undefined | null, needle: string): boolean {
  if (!haystack) return false;
  return normalizeTr(haystack).includes(needle);
}

export function getSectorName(slug: string): string {
  return SECTORS.find((s) => s.slug === slug)?.name ?? slug;
}
