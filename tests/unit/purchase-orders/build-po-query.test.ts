/**
 * buildPOQuery Unit Tests
 *
 * Tests for filter-to-query mapping:
 * - Empty filters return only undefined values
 * - dateRange maps to startDate/endDate
 * - totalRange maps to valueMin/valueMax
 * - status array is sorted
 * - Single status works
 *
 * @see src/components/domain/purchase-orders/po-filter-config.ts
 */

import { describe, it, expect } from 'vitest';
import { buildPOQuery, DEFAULT_PO_FILTERS } from '@/components/domain/purchase-orders/po-filter-config';

describe('buildPOQuery', () => {
  it('with empty filters returns only undefined values', () => {
    const result = buildPOQuery(DEFAULT_PO_FILTERS);
    expect(result).toEqual({
      search: undefined,
      status: undefined,
      supplierId: undefined,
      startDate: undefined,
      endDate: undefined,
      valueMin: undefined,
      valueMax: undefined,
    });
  });

  it('maps dateRange to startDate/endDate', () => {
    const from = new Date('2025-01-01T00:00:00.000Z');
    const to = new Date('2025-01-31T23:59:59.999Z');
    const result = buildPOQuery({
      ...DEFAULT_PO_FILTERS,
      dateRange: { from, to },
    });
    expect(result.startDate).toBe(from.toISOString());
    expect(result.endDate).toBe(to.toISOString());
  });

  it('handles partial dateRange; from only', () => {
    const from = new Date('2025-01-01');
    const result = buildPOQuery({
      ...DEFAULT_PO_FILTERS,
      dateRange: { from, to: null },
    });
    expect(result.startDate).toBe(from.toISOString());
    expect(result.endDate).toBeUndefined();
  });

  it('handles partial dateRange; to only', () => {
    const to = new Date('2025-01-31');
    const result = buildPOQuery({
      ...DEFAULT_PO_FILTERS,
      dateRange: { from: null, to },
    });
    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBe(to.toISOString());
  });

  it('maps totalRange to valueMin/valueMax', () => {
    const result = buildPOQuery({
      ...DEFAULT_PO_FILTERS,
      totalRange: { min: 100, max: 5000 },
    });
    expect(result.valueMin).toBe(100);
    expect(result.valueMax).toBe(5000);
  });

  it('handles partial totalRange; min only', () => {
    const result = buildPOQuery({
      ...DEFAULT_PO_FILTERS,
      totalRange: { min: 100, max: null },
    });
    expect(result.valueMin).toBe(100);
    expect(result.valueMax).toBeUndefined();
  });

  it('handles partial totalRange; max only', () => {
    const result = buildPOQuery({
      ...DEFAULT_PO_FILTERS,
      totalRange: { min: null, max: 5000 },
    });
    expect(result.valueMin).toBeUndefined();
    expect(result.valueMax).toBe(5000);
  });

  it('maps status array (sorted)', () => {
    const result = buildPOQuery({
      ...DEFAULT_PO_FILTERS,
      status: ['closed', 'ordered', 'approved'],
    });
    expect(result.status).toEqual(['approved', 'closed', 'ordered']);
  });

  it('with single status works', () => {
    const result = buildPOQuery({
      ...DEFAULT_PO_FILTERS,
      status: ['pending_approval'],
    });
    expect(result.status).toEqual(['pending_approval']);
  });

  it('maps search and supplierId', () => {
    const result = buildPOQuery({
      ...DEFAULT_PO_FILTERS,
      search: 'PO-123',
      supplierId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.search).toBe('PO-123');
    expect(result.supplierId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('returns undefined for empty search and null supplierId', () => {
    const result = buildPOQuery({
      ...DEFAULT_PO_FILTERS,
      search: '',
      supplierId: null,
    });
    expect(result.search).toBeUndefined();
    expect(result.supplierId).toBeUndefined();
  });
});
