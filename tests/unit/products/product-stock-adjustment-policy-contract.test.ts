import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('product stock adjustment policy contract', () => {
  it('threads product stock-in eligibility into the adjustment dialog', () => {
    const detailView = compact(read('src/components/domain/products/views/product-detail-view.tsx'));
    const tab = compact(read('src/components/domain/products/tabs/inventory-tab.tsx'));
    const container = compact(read('src/components/domain/products/tabs/inventory-tab-container.tsx'));
    const presenter = compact(read('src/components/domain/products/tabs/inventory-tab-view.tsx'));
    const dialog = compact(read('src/components/domain/products/inventory/stock-adjustment.tsx'));

    expect(detailView).toContain('status={product.status}');
    expect(detailView).toContain('isActive={product.isActive}');
    expect(detailView).toContain('isPurchasable={product.isPurchasable}');
    expect(tab).toContain('status={status}');
    expect(tab).toContain('isActive={isActive}');
    expect(tab).toContain('isPurchasable={isPurchasable}');
    expect(container).toContain('constcanIncreaseStock=status==="active"&&isActive&&trackInventory;');
    expect(container).toContain('constcanReceiveStock=canIncreaseStock;');
    expect(container).toContain('constcanOrderStock=status==="active"&&isActive&&isPurchasable;');
    expect(container).toContain('canReceiveStock={canReceiveStock}');
    expect(container).toContain('canOrderStock={canOrderStock}');
    expect(presenter).toContain('canIncreaseStock={canIncreaseStock}');
    expect(dialog).toContain('canIncreaseStock=true');
    expect(dialog).toContain('if(!canIncreaseStock&&adjustmentQty>0)');
    expect(dialog).toContain('disabled={!canIncreaseStock}');
    expect(dialog).toContain('blockedPositiveAdjustment');
    expect(presenter).toContain('disabled={!canOrderStock}');
    expect(presenter).toContain('disabled={!canReceiveStock}');
  });
});
