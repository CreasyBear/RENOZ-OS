import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('purchase order list mutation feedback contract', () => {
  it('keeps list mutation failures on the purchase-order formatter and cache contract', () => {
    const route = read('src/routes/_authenticated/purchase-orders/purchase-orders-page.tsx');
    const formatter = read('src/hooks/purchase-orders/_mutation-errors.ts');
    const hooksIndex = read('src/hooks/purchase-orders/index.ts');
    const supplierHooks = read('src/hooks/suppliers/use-purchase-orders.ts');

    expect(formatter).toContain('formatPurchaseOrderMutationError');
    expect(formatter).toContain('formatPurchaseOrderBulkFailureReason');
    expect(hooksIndex).toContain('formatPurchaseOrderMutationError');
    expect(route).toContain(
      "import {\n  formatPurchaseOrderBulkFailureReason,\n  formatPurchaseOrderMutationError,\n} from '@/hooks/purchase-orders/_mutation-errors';"
    );

    expect(route).toContain(
      "formatPurchaseOrderMutationError(error, 'Failed to delete purchase order')"
    );
    expect(route).toContain(
      "formatPurchaseOrderMutationError(error, 'Failed to bulk approve purchase orders')"
    );
    expect(route).toContain(
      "formatPurchaseOrderMutationError(error, 'Failed to bulk delete purchase orders')"
    );
    expect(route).toContain(
      "formatPurchaseOrderMutationError(error, 'Failed to retry bulk delete')"
    );
    expect(route).toContain('formatPurchaseOrderBulkFailureReason(f.error)');
    expect(route).not.toContain('error instanceof Error ? error.message');
    expect(route).not.toContain('error: f.error');

    expect(supplierHooks).toContain('queryKeys.suppliers.purchaseOrdersList()');
    expect(supplierHooks).toContain('queryKeys.suppliers.purchaseOrderStatusCounts()');
  });
});
