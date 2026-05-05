import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('purchase order create mutation feedback contract', () => {
  it('keeps create failures on the purchase-order formatter and cache contract', () => {
    const createPage = read('src/routes/_authenticated/purchase-orders/-create-page.tsx');
    const supplierHooks = read('src/hooks/suppliers/use-purchase-orders.ts');

    expect(createPage).toContain(
      'import { formatPurchaseOrderMutationError } from "@/hooks/purchase-orders/_mutation-errors";'
    );
    expect(createPage).toContain('toast.error("Failed to create purchase order"');
    expect(createPage).toContain(
      'description: formatPurchaseOrderMutationError('
    );
    expect(createPage).toContain('"Review the purchase order details and try again."');
    expect(createPage).not.toContain('error instanceof Error ? error.message');
    expect(createPage).not.toContain('"An unexpected error occurred"');

    expect(supplierHooks).toContain('export function useCreatePurchaseOrder()');
    expect(supplierHooks).toContain('queryKeys.suppliers.purchaseOrdersList()');
    expect(supplierHooks).toContain('queryKeys.suppliers.purchaseOrderStatusCounts()');
  });
});
