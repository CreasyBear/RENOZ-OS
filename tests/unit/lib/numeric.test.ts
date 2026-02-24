/**
 * safeNumber Unit Tests
 *
 * Verifies numeric coercion at query-result boundaries.
 * Postgres returns numeric/decimal as strings; safeNumber prevents NaN propagation.
 *
 * @see src/lib/numeric.ts
 * @see FIN-004
 */

import { describe, it, expect } from 'vitest';
import { safeNumber } from '@/lib/numeric';

describe('safeNumber', () => {
  it('returns 0 for null and undefined', () => {
    expect(safeNumber(null)).toBe(0);
    expect(safeNumber(undefined)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(safeNumber(NaN)).toBe(0);
  });

  it('returns number as-is when valid', () => {
    expect(safeNumber(42)).toBe(42);
    expect(safeNumber(0)).toBe(0);
    expect(safeNumber(-1.5)).toBe(-1.5);
  });

  it('parses string numbers from Postgres', () => {
    expect(safeNumber('123.45')).toBe(123.45);
    expect(safeNumber('5335.00')).toBe(5335);
    expect(safeNumber('0')).toBe(0);
  });

  it('returns 0 for invalid string', () => {
    expect(safeNumber('invalid')).toBe(0);
    expect(safeNumber('')).toBe(0);
    expect(safeNumber('  ')).toBe(0);
  });

  it('handles other types via Number()', () => {
    expect(safeNumber(true)).toBe(1);
    expect(safeNumber(false)).toBe(0);
  });
});
