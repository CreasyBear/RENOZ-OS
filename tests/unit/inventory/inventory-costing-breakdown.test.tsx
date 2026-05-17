import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CostingBreakdown } from '@/components/domain/inventory/views/inventory-costing-breakdown';
import type { ItemDetailData } from '@/components/domain/inventory/item-detail';
import type { CostLayer } from '@/components/domain/inventory/item-tabs';

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount }: { amount: number | null | undefined }) => (
    <span>${amount ?? 'missing'}</span>
  ),
}));

function item(overrides: Partial<ItemDetailData> = {}): ItemDetailData {
  return {
    id: 'item-1',
    productId: 'product-1',
    productName: 'Battery Module',
    productSku: 'BAT-100',
    locationId: 'location-1',
    locationName: 'Main Warehouse',
    locationCode: 'WH-1',
    quantityOnHand: 10,
    quantityAllocated: 2,
    quantityAvailable: 8,
    unitCost: 100,
    totalValue: 1000,
    status: 'available',
    ...overrides,
  };
}

function costLayer(overrides: Partial<CostLayer>): CostLayer {
  return {
    id: overrides.id ?? 'layer-1',
    receivedAt: overrides.receivedAt ?? new Date('2026-01-01T00:00:00.000Z'),
    quantityReceived: overrides.quantityReceived ?? 10,
    quantityRemaining: overrides.quantityRemaining ?? 8,
    unitCost: overrides.unitCost ?? 100,
    totalCost: overrides.totalCost ?? 800,
    ...overrides,
  };
}

describe('CostingBreakdown', () => {
  it('renders item-level cost and FIFO method without a weighted average when no layers exist', () => {
    render(<CostingBreakdown item={item()} costLayers={[]} />);

    expect(screen.getByText('Costing')).toBeInTheDocument();
    expect(screen.getByText('Unit Cost')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.getByText('$1000')).toBeInTheDocument();
    expect(screen.getByText('Cost Layers')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('FIFO')).toBeInTheDocument();
    expect(screen.queryByText('Weighted Avg')).not.toBeInTheDocument();
    expect(screen.queryByText('Oldest Layer')).not.toBeInTheDocument();
  });

  it('renders weighted average and oldest layer when valuation layers exist', () => {
    render(
      <CostingBreakdown
        item={item({ totalValue: 1200 })}
        costLayers={[
          costLayer({
            id: 'layer-1',
            receivedAt: new Date('2026-01-01T00:00:00.000Z'),
            quantityRemaining: 8,
            totalCost: 800,
          }),
          costLayer({
            id: 'layer-2',
            receivedAt: new Date('2026-02-01T00:00:00.000Z'),
            quantityRemaining: 2,
            totalCost: 240,
          }),
        ]}
      />
    );

    expect(screen.getByText('Weighted Avg')).toBeInTheDocument();
    expect(screen.getByText('$104')).toBeInTheDocument();
    expect(screen.getByText('$1200')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Oldest Layer')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2026')).toBeInTheDocument();
  });

  it('keeps the costing breakdown out of the inventory detail presenter', () => {
    const root = process.cwd();
    const detailView = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-detail-view.tsx'),
      'utf8'
    );
    const costingBreakdown = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-costing-breakdown.tsx'),
      'utf8'
    );

    expect(detailView).toContain(
      "import { CostingBreakdown } from './inventory-costing-breakdown'"
    );
    expect(detailView).not.toContain('function CostingBreakdown');
    expect(costingBreakdown).toContain('export function CostingBreakdown');
    expect(costingBreakdown).toContain('Weighted Avg');
  });
});
