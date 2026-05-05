import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('purchase order cost mutation feedback contract', () => {
  it('keeps PO cost failures on the purchase-order formatter and cache contract', () => {
    const costsTab = read('src/components/domain/purchase-orders/tabs/po-costs-tab.tsx');
    const costHooks = read('src/hooks/suppliers/use-po-costs.ts');

    expect(costsTab).toContain(
      "import { formatPurchaseOrderMutationError } from '@/hooks/purchase-orders/_mutation-errors';"
    );
    expect(costsTab.match(/formatPurchaseOrderMutationError\(/g)).toHaveLength(2);
    expect(costsTab).not.toContain("toastError(editingCostId ? 'Failed to update cost' : 'Failed to add cost')");
    expect(costsTab).not.toContain("toastError('Failed to remove cost')");
    expect(costsTab).not.toContain('catch {');
    expect(costsTab).toContain("'Failed to update cost' : 'Failed to add cost'");
    expect(costsTab).toContain("formatPurchaseOrderMutationError(error, 'Failed to remove cost')");

    expect(costHooks).toContain('queryKeys.suppliers.purchaseOrderCosts(variables.purchaseOrderId)');
    expect(costHooks).toContain(
      'queryKeys.suppliers.purchaseOrderAllocatedCosts(variables.purchaseOrderId)'
    );
    expect(costHooks).toContain('queryKeys.suppliers.purchaseOrderCosts(poId)');
    expect(costHooks).toContain('queryKeys.suppliers.purchaseOrderAllocatedCosts(poId)');
  });
});
