import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CostLayersTabContent } from '@/components/domain/inventory/views/inventory-cost-layers-tab-content';
import type { CostLayer } from '@/components/domain/inventory/item-tabs';

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount }: { amount: number | null | undefined }) => (
    <span>${amount ?? 'missing'}</span>
  ),
}));

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

describe('CostLayersTabContent', () => {
  it('renders an honest empty state when no valuation layers exist', () => {
    render(<CostLayersTabContent costLayers={[]} />);

    expect(screen.getByText('No cost layers recorded')).toBeInTheDocument();
  });

  it('renders loading placeholders while valuation layers are loading', () => {
    const { container } = render(<CostLayersTabContent isLoading />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(12);
  });

  it('renders layer sequence, received dates, quantities, values, landed cost components, and totals', () => {
    render(
      <CostLayersTabContent
        costLayers={[
          costLayer({
            id: 'layer-1',
            receivedAt: new Date('2026-01-01T00:00:00.000Z'),
            expiryDate: new Date('2026-12-31T00:00:00.000Z'),
            quantityReceived: 10,
            quantityRemaining: 8,
            unitCost: 100,
            totalCost: 800,
            costComponents: [
              {
                id: 'component-1',
                componentType: 'base_unit_cost',
                costType: 'unit',
                quantityBasis: 10,
                amountTotal: 750,
                amountPerUnit: 75,
                currency: 'AUD',
              },
              {
                id: 'component-2',
                componentType: 'allocated_additional_cost',
                costType: 'freight',
                quantityBasis: 10,
                amountTotal: 50,
                amountPerUnit: 5,
                currency: 'AUD',
              },
            ],
          }),
          costLayer({
            id: 'layer-2',
            receivedAt: new Date('2026-02-01T00:00:00.000Z'),
            quantityReceived: 5,
            quantityRemaining: 2,
            unitCost: 120,
            totalCost: 240,
          }),
        ]}
      />
    );

    expect(screen.getByText('L1')).toBeInTheDocument();
    expect(screen.getByText('L2')).toBeInTheDocument();
    expect(screen.getByText('Received: Jan 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('Expires: Dec 31, 2026')).toBeInTheDocument();
    expect(screen.getByText('of 10')).toBeInTheDocument();
    expect(screen.getByText('Base Unit Cost')).toBeInTheDocument();
    expect(screen.getByText('Allocated Additional Cost')).toBeInTheDocument();
    expect(screen.getByText('freight')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('$1040')).toBeInTheDocument();
  });

  it('keeps the cost layer tab out of the inventory detail presenter', () => {
    const root = process.cwd();
    const detailView = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-detail-view.tsx'),
      'utf8'
    );
    const costLayersTab = readFileSync(
      join(root, 'src/components/domain/inventory/views/inventory-cost-layers-tab-content.tsx'),
      'utf8'
    );

    expect(detailView).toContain(
      "import { CostLayersTabContent } from './inventory-cost-layers-tab-content'"
    );
    expect(detailView).not.toContain('function CostLayersTabContent');
    expect(costLayersTab).toContain('export function CostLayersTabContent');
    expect(costLayersTab).toContain('Landed Cost Components');
  });
});
