import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('purchase order detail mutation feedback contract', () => {
  it('keeps detail lifecycle failures on the purchase-order formatter and cache contract', () => {
    const detail = read('src/components/domain/purchase-orders/containers/po-detail-container.tsx');
    const supplierHooks = read('src/hooks/suppliers/use-purchase-orders.ts');

    expect(detail).toContain(
      "import { formatPurchaseOrderMutationError } from '@/hooks/purchase-orders/_mutation-errors';"
    );
    expect(detail.match(/formatPurchaseOrderMutationError\(error,/g)).toHaveLength(7);
    expect(detail).not.toContain('catch {');

    for (const fallback of [
      'Failed to submit for approval',
      'Failed to approve purchase order',
      'Failed to reject purchase order',
      'Failed to mark as ordered',
      'Failed to cancel purchase order',
      'Failed to delete purchase order',
      'Failed to update purchase order',
    ]) {
      expect(detail).toContain(`formatPurchaseOrderMutationError(error, '${fallback}')`);
    }

    expect(supplierHooks).toContain('queryKeys.suppliers.purchaseOrdersList()');
    expect(supplierHooks).toContain('queryKeys.suppliers.purchaseOrderStatusCounts()');
    expect(supplierHooks).toContain('queryKeys.suppliers.purchaseOrderDetail(variables.id)');
    expect(supplierHooks).toContain('queryKeys.suppliers.purchaseOrdersPendingApprovals()');
  });
});
