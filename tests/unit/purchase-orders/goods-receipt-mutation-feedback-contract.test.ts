import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('goods receipt mutation feedback contract', () => {
  it('keeps receive failures on the purchase-order formatter and preserves receive invalidations', () => {
    const dialog = read('src/components/domain/purchase-orders/receive/goods-receipt-dialog.tsx');
    const receiveHook = read('src/hooks/suppliers/use-goods-receipt.ts');

    expect(dialog).toContain(
      "import { formatPurchaseOrderMutationError } from '@/hooks/purchase-orders/_mutation-errors';"
    );
    expect(dialog).toContain(
      "formatPurchaseOrderMutationError(\n          error,\n          'Failed to receive goods. Please try again.'"
    );
    expect(dialog).not.toContain('error instanceof Error ? error.message');
    expect(dialog).not.toContain(
      "toastError(error instanceof Error ? error.message : 'Failed to receive goods. Please try again.')"
    );

    expect(receiveHook).toContain(
      'queryKeys.suppliers.purchaseOrderDetail(variables.purchaseOrderId)'
    );
    expect(receiveHook).toContain('queryKeys.suppliers.purchaseOrdersList()');
    expect(receiveHook).toContain(
      'queryKeys.suppliers.purchaseOrderReceipts(variables.purchaseOrderId)'
    );
    expect(receiveHook).toContain('invalidateInventoryStockMutationQueries(queryClient');
    expect(receiveHook).toContain('includeMovements: true');
    expect(receiveHook).not.toContain('queryKeys.inventory.all');
    expect(receiveHook).not.toContain('queryKeys.products.all');
  });
});
