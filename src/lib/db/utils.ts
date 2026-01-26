/**
 * Database Utility Functions
 *
 * Common utilities for safe database operations.
 */

/**
 * Escapes LIKE/ILIKE pattern characters to prevent pattern injection.
 *
 * LIKE patterns use % and _ as wildcards. If user input contains these
 * characters, they can manipulate the search behavior (pattern injection).
 *
 * This function escapes:
 * - % (matches any sequence of characters)
 * - _ (matches any single character)
 * - \ (the escape character itself)
 *
 * @example
 * ```typescript
 * // User searches for "50% off"
 * const search = "50% off";
 * const escaped = escapeLike(search); // "50\% off"
 *
 * // Safe to use in query
 * db.select().from(products).where(ilike(products.name, `%${escaped}%`));
 * ```
 *
 * @param value - The user input to escape
 * @returns The escaped string safe for LIKE/ILIKE patterns
 */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

/**
 * Escapes and wraps a value for substring matching.
 *
 * Convenience function that escapes the value and wraps it with % wildcards
 * for substring (contains) matching.
 *
 * @example
 * ```typescript
 * const search = "50% off";
 * const pattern = containsPattern(search); // "%50\% off%"
 *
 * db.select().from(products).where(ilike(products.name, pattern));
 * ```
 *
 * @param value - The user input to escape and wrap
 * @returns The escaped string wrapped with % wildcards
 */
export function containsPattern(value: string): string {
  return `%${escapeLike(value)}%`;
}

