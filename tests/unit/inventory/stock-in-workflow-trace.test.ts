import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const receiveInventoryMock = vi.hoisted(() => vi.fn(async () => ({ id: 'receive-result' })));
const adjustInventoryMock = vi.hoisted(() => vi.fn(async () => ({ id: 'adjust-result' })));
const transferInventoryMock = vi.hoisted(() => vi.fn(async () => ({ id: 'transfer-result' })));

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: () => ({
      handler: (handler: unknown) => handler,
    }),
  }),
}));

vi.mock('@/server/functions/inventory/receiving', () => ({
  receiveInventory: receiveInventoryMock,
}));

vi.mock('@/server/functions/inventory/adjustments', () => ({
  adjustInventory: adjustInventoryMock,
}));

vi.mock('@/server/functions/inventory/transfers', () => ({
  transferInventory: transferInventoryMock,
}));

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('stock-in workflow trace', () => {
  beforeEach(() => {
    receiveInventoryMock.mockClear();
    adjustInventoryMock.mockClear();
    transferInventoryMock.mockClear();
  });

  it('does not document a product bulk receive endpoint that is not in code', () => {
    const trace = read('docs/code-traces/02-inventory-stock-in.md');
    const traceIndex = read('docs/code-traces/README.md');
    const productInventoryServer = read('src/server/functions/products/product-inventory.ts');

    expect(productInventoryServer).not.toContain('bulkReceiveStock');
    expect(trace).not.toContain('bulkReceiveStock');
    expect(traceIndex).not.toContain('bulkReceiveStock');
  });

  it('keeps the bulk PO receipt trace aligned with live preflight and cache contracts', () => {
    const trace = read('docs/code-traces/02-inventory-stock-in.md');
    const bulkReceiveServer = read('src/server/functions/suppliers/bulk-receive-goods.ts');
    const bulkReceiveHook = read('src/hooks/suppliers/use-bulk-receive-goods.ts');

    expect(bulkReceiveServer).toContain('findBulkReceiveDuplicateSerialFailures');
    expect(bulkReceiveServer).toContain("'invalid_serial_state'");
    expect(bulkReceiveHook).toContain('purchaseOrderStatusCounts');
    expect(bulkReceiveHook).toContain('purchaseOrdersReceivingSummary');
    expect(bulkReceiveHook).toContain('purchaseOrderReceipts(purchaseOrderId)');

    expect(trace).toContain('batch serial preflight');
    expect(trace).toContain('invalid_serial_state');
    expect(trace).toContain('typed row failures');
    expect(trace).toContain('purchase-order list, status counts, receiving summary, pending approvals');
    expect(trace).toContain('errors[]');
    expect(trace).toContain('optional row `code`');
  });

  it('keeps product inventory receive wrappers delegated to canonical inventory endpoints', () => {
    const productInventoryServer = read('src/server/functions/products/product-inventory.ts');

    expect(productInventoryServer).toContain(
      "import { receiveInventory } from '@/server/functions/inventory/receiving';",
    );
    expect(productInventoryServer).toContain(
      "import { adjustInventory } from '@/server/functions/inventory/adjustments';",
    );
    expect(productInventoryServer).toContain(
      "import { transferInventory } from '@/server/functions/inventory/transfers';",
    );
    expect(productInventoryServer).toContain('return receiveInventory({');
    expect(productInventoryServer).toContain('return adjustInventory({');
    expect(productInventoryServer).toContain('return transferInventory({');
  });

  it('routes product receiveStock through canonical manual receiving at runtime', async () => {
    const { receiveStock } = await import('@/server/functions/products/product-inventory');

    await receiveStock({
      data: {
        productId: 'product-1',
        locationId: 'location-1',
        quantity: 3,
        unitCost: 12.5,
        referenceType: 'manual',
        referenceId: '11111111-1111-1111-1111-111111111111',
        notes: 'initial inbound stock',
      },
    });

    expect(receiveInventoryMock).toHaveBeenCalledWith({
      data: {
        productId: 'product-1',
        locationId: 'location-1',
        quantity: 3,
        unitCost: 12.5,
        receiptReason: 'initial_stock',
        referenceId: '11111111-1111-1111-1111-111111111111',
        referenceType: 'manual',
        notes: 'initial inbound stock',
      },
    });
  });

  it('routes generic receive movements through canonical manual receiving at runtime', async () => {
    const { recordMovement } = await import('@/server/functions/products/product-inventory');

    await recordMovement({
      data: {
        productId: 'product-1',
        locationId: 'location-1',
        movementType: 'receive',
        quantity: 2,
        unitCost: 8,
        referenceType: 'manual',
        referenceId: '22222222-2222-2222-2222-222222222222',
        notes: 'legacy receive movement',
      },
    });

    expect(receiveInventoryMock).toHaveBeenCalledWith({
      data: {
        productId: 'product-1',
        locationId: 'location-1',
        quantity: 2,
        unitCost: 8,
        receiptReason: 'initial_stock',
        referenceId: '22222222-2222-2222-2222-222222222222',
        referenceType: 'manual',
        notes: 'legacy receive movement',
      },
    });
  });

  it('routes generic adjust movements through row-scoped canonical adjustment at runtime', async () => {
    const { recordMovement } = await import('@/server/functions/products/product-inventory');

    await recordMovement({
      data: {
        inventoryId: 'inventory-row-1',
        productId: 'product-1',
        locationId: 'location-1',
        movementType: 'adjust',
        quantity: -1,
        metadata: {
          reason: 'Cycle count variance',
        },
        notes: 'Cycle count variance',
      },
    });

    expect(adjustInventoryMock).toHaveBeenCalledWith({
      data: {
        inventoryId: 'inventory-row-1',
        productId: 'product-1',
        locationId: 'location-1',
        adjustmentQty: -1,
        reason: 'Cycle count variance',
        notes: 'Cycle count variance',
      },
    });
  });

  it('routes product adjustStock through row-scoped canonical adjustment when a row is provided', async () => {
    const { adjustStock } = await import('@/server/functions/products/product-inventory');

    await adjustStock({
      data: {
        inventoryId: 'inventory-row-1',
        productId: 'product-1',
        locationId: 'location-1',
        adjustmentQty: 2,
        reason: 'Inventory found',
        notes: 'Recovered in warehouse',
      },
    });

    expect(adjustInventoryMock).toHaveBeenCalledWith({
      data: {
        inventoryId: 'inventory-row-1',
        productId: 'product-1',
        locationId: 'location-1',
        adjustmentQty: 2,
        reason: 'Inventory found',
        notes: 'Recovered in warehouse',
      },
    });
  });

  it('routes generic transfer movements through row-scoped canonical transfer at runtime', async () => {
    const { recordMovement } = await import('@/server/functions/products/product-inventory');

    await recordMovement({
      data: {
        inventoryId: 'inventory-row-1',
        productId: 'product-1',
        locationId: 'location-1',
        movementType: 'transfer',
        quantity: -2,
        metadata: {
          toLocationId: 'location-2',
          reason: 'Move to dispatch shelf',
        },
        notes: 'Move to dispatch shelf',
      },
    });

    expect(transferInventoryMock).toHaveBeenCalledWith({
      data: {
        inventoryId: 'inventory-row-1',
        productId: 'product-1',
        fromLocationId: 'location-1',
        toLocationId: 'location-2',
        quantity: 2,
        reason: 'Move to dispatch shelf',
        notes: 'Move to dispatch shelf',
      },
    });
  });

  it('rejects generic transfer movements without a source inventory row', async () => {
    const { recordMovement } = await import('@/server/functions/products/product-inventory');

    await expect(
      recordMovement({
        data: {
          productId: 'product-1',
          locationId: 'location-1',
          movementType: 'transfer',
          quantity: -2,
          metadata: {
            toLocationId: 'location-2',
            reason: 'Move to dispatch shelf',
          },
        },
      })
    ).rejects.toThrow('Transfer movement requires a source inventory row');
    expect(transferInventoryMock).not.toHaveBeenCalled();
  });
});
