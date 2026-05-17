import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryDashboardTopMoversPanel } from '@/components/domain/inventory/inventory-dashboard-top-movers-panel';
import type { DashboardTopMovingItem } from '@/lib/schemas/inventory';

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value?: number }) => (
    <div data-testid="top-mover-progress" data-value={String(value)} />
  ),
}));

function mover(overrides: Partial<DashboardTopMovingItem>): DashboardTopMovingItem {
  return {
    productId: overrides.productId ?? 'product-1',
    productName: 'productName' in overrides ? overrides.productName ?? null : 'Battery Module',
    productSku: overrides.productSku,
    sku: overrides.sku,
    movementCount: overrides.movementCount ?? 3,
    totalQuantity: overrides.totalQuantity ?? 12,
    trend: overrides.trend,
  };
}

function renderPanel(props: Partial<React.ComponentProps<typeof InventoryDashboardTopMoversPanel>> = {}) {
  render(
    <InventoryDashboardTopMoversPanel
      topMoving={[
        mover({
          productId: 'product-1',
          productName: 'Battery Module',
          productSku: 'BAT-001',
          totalQuantity: 10,
          trend: 'up',
        }),
        mover({
          productId: 'product-2',
          productName: null,
          sku: 'LEGACY-002',
          totalQuantity: 5,
          trend: 'down',
        }),
      ]}
      isLoading={false}
      showUnavailable={false}
      showDegraded={false}
      readErrorMessage="Top movers unavailable"
      {...props}
    />
  );
}

describe('InventoryDashboardTopMoversPanel', () => {
  it('renders normalized top mover rows with progress scaled to the highest mover', () => {
    renderPanel();

    expect(screen.getByText('Top Moving Products')).toBeInTheDocument();
    expect(screen.getByText('By movement volume this period')).toBeInTheDocument();
    expect(screen.getByText('Battery Module')).toBeInTheDocument();
    expect(screen.getByText('BAT-001')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('LEGACY-002')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getAllByTestId('top-mover-progress')[0]).toHaveAttribute('data-value', '100');
    expect(screen.getAllByTestId('top-mover-progress')[1]).toHaveAttribute('data-value', '50');
  });

  it('renders unavailable copy instead of pretending there are no movers', () => {
    renderPanel({
      showUnavailable: true,
      readErrorMessage: 'Dashboard read failed',
    });

    expect(screen.getByText('Top movers are temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByText('Dashboard read failed')).toBeInTheDocument();
    expect(screen.queryByText('Battery Module')).not.toBeInTheDocument();
  });

  it('keeps zero-quantity mover progress stable instead of producing NaN', () => {
    renderPanel({
      topMoving: [
        mover({
          productId: 'product-zero',
          productName: 'Zero Movement',
          totalQuantity: 0,
        }),
      ],
    });

    expect(screen.getByText('Zero Movement')).toBeInTheDocument();
    expect(screen.getByTestId('top-mover-progress')).toHaveAttribute('data-value', '0');
  });

  it('renders an honest empty state when there is no movement data', () => {
    renderPanel({ topMoving: [] });

    expect(screen.getByText('No movement data yet')).toBeInTheDocument();
  });

  it('renders a stable skeleton while dashboard movers are loading', () => {
    const { container } = render(
      <InventoryDashboardTopMoversPanel
        topMoving={[]}
        isLoading
        showUnavailable={false}
        showDegraded={false}
        readErrorMessage="Loading"
      />
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(20);
  });

  it('keeps top movers presentation and read-warning markup out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const topMoversPanel = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-top-movers-panel.tsx'),
      'utf8'
    );
    const readWarning = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-read-warning.tsx'),
      'utf8'
    );

    expect(dashboard).toContain('InventoryDashboardTopMoversPanel');
    expect(dashboard).toContain('InventoryDashboardReadWarning');
    expect(dashboard).not.toContain('function TopMoversList');
    expect(dashboard).not.toContain('function TopMoversSkeleton');
    expect(dashboard).not.toContain('function DashboardReadWarning');
    expect(dashboard).not.toContain('Top Moving Products');
    expect(dashboard).not.toContain('DashboardTopMovingItem');
    expect(topMoversPanel).toContain('export function InventoryDashboardTopMoversPanel');
    expect(topMoversPanel).toContain('function TopMoversList');
    expect(readWarning).toContain('export function InventoryDashboardReadWarning');
  });
});
