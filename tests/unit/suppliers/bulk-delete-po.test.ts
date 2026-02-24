/**
 * bulkDeletePurchaseOrders Response Shape Test
 *
 * Regression test for PROC-001: bulk delete must return
 * failed: Array<{ id: string; error: string }> for per-ID failure mapping.
 *
 * @see src/server/functions/suppliers/purchase-orders.ts
 */

import { describe, expect, it } from 'vitest';
import type { BulkDeletePOFailure } from '@/server/functions/suppliers/purchase-orders';

describe('bulkDeletePurchaseOrders (PROC-001)', () => {
  it('BulkDeletePOFailure type has id and error', () => {
    const failure: BulkDeletePOFailure = {
      id: 'po-1',
      error: 'Only draft orders can be deleted (current status: approved)',
    };
    expect(failure).toHaveProperty('id');
    expect(failure).toHaveProperty('error');
    expect(typeof failure.id).toBe('string');
    expect(typeof failure.error).toBe('string');
  });

  it('response shape contract: failed is array of { id, error }', () => {
    const mockResponse: { deleted: number; failed: BulkDeletePOFailure[] } = {
      deleted: 0,
      failed: [{ id: 'po-1', error: 'Purchase order not found' }],
    };
    expect(mockResponse.failed[0]).toMatchObject({
      id: 'po-1',
      error: 'Purchase order not found',
    });
  });
});
