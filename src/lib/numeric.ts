/**
 * Numeric coercion utilities for query results.
 *
 * Postgres returns numeric/decimal as strings. Drizzle/drivers may return
 * various types. Use these helpers to ensure we never propagate NaN/undefined
 * to the UI—only valid numbers or 0 when truly empty.
 *
 * @see Revenue (Cash) $NaN fix - query hardening
 */

/**
 * Coerce any query result to a safe number.
 * Returns 0 for null, undefined, NaN, or invalid values.
 * Handles string "5335.00" from Postgres numeric columns.
 *
 * Use at the boundary where raw query results enter application logic.
 */
export function safeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}
