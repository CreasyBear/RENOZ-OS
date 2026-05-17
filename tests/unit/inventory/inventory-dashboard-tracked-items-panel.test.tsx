import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ComponentProps, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryDashboardTrackedItemsPanel } from '@/components/domain/inventory/inventory-dashboard-tracked-items-panel';
import type { TrackedProductWithInventory } from '@/lib/schemas/dashboard/tracked-products';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    children: ReactNode;
    to: string;
    params?: { productId?: string };
    search?: { tab?: string };
  }) => (
    <a
      href={`${to.replace('$productId', params?.productId ?? '')}?tab=${search?.tab ?? ''}`}
      {...props}
    >
      {children}
    </a>
  ),
}));

function trackedProduct(overrides: Partial<TrackedProductWithInventory>): TrackedProductWithInventory {
  return {
    id: overrides.id ?? '00000000-0000-4000-8000-000000000001',
    sku: overrides.sku ?? 'BAT-001',
    name: overrides.name ?? 'Battery Module',
    label: overrides.label,
    quantity: overrides.quantity ?? 24,
  };
}

function renderPanel(props: Partial<ComponentProps<typeof InventoryDashboardTrackedItemsPanel>> = {}) {
  const onEdit = vi.fn();
  const view = render(
    <InventoryDashboardTrackedItemsPanel
      items={[
        trackedProduct({
          id: '00000000-0000-4000-8000-000000000001',
          sku: 'BAT-001',
          name: 'Battery Module',
          quantity: 24,
        }),
      ]}
      selectedCount={1}
      isLoading={false}
      warningMessage={null}
      unavailableMessage={null}
      onEdit={onEdit}
      {...props}
    />
  );

  return { ...view, onEdit };
}

describe('InventoryDashboardTrackedItemsPanel', () => {
  it('renders tracked item quantities and stock status mapping', () => {
    renderPanel({
      items: [
        trackedProduct({
          id: '00000000-0000-4000-8000-000000000001',
          sku: 'BAT-HEALTHY',
          name: 'Healthy Battery',
          quantity: 24,
        }),
        trackedProduct({
          id: '00000000-0000-4000-8000-000000000002',
          sku: 'BAT-LOW',
          name: 'Low Battery',
          quantity: 10,
        }),
        trackedProduct({
          id: '00000000-0000-4000-8000-000000000003',
          sku: 'BAT-OUT',
          name: 'Out Battery',
          quantity: 0,
        }),
      ],
    });

    expect(screen.getByText('Tracked Items')).toBeInTheDocument();
    expect(screen.getByText('BAT-HEALTHY')).toBeInTheDocument();
    expect(screen.getByText('Healthy Battery')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('BAT-LOW')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('BAT-OUT')).toBeInTheDocument();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /BAT-HEALTHY/ })).toHaveAttribute(
      'href',
      '/products/00000000-0000-4000-8000-000000000001?tab=inventory'
    );
  });

  it('shows an unavailable warning only when tracked products are selected', () => {
    renderPanel({
      selectedCount: 2,
      unavailableMessage: 'Tracked product inventory is temporarily unavailable.',
    });

    expect(screen.getByText('Tracked items are temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByText('Tracked product inventory is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('BAT-001')).not.toBeInTheDocument();
  });

  it('keeps the empty state honest when no tracked products are selected', () => {
    const { onEdit } = renderPanel({
      items: [],
      selectedCount: 0,
      unavailableMessage: 'Tracked product inventory is temporarily unavailable.',
    });

    expect(screen.getByText('No items tracked yet')).toBeInTheDocument();
    expect(screen.queryByText('Tracked items are temporarily unavailable.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add items to track' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('keeps stale warnings visible while tracked counts remain visible', () => {
    renderPanel({
      warningMessage: 'Showing the most recent tracked product counts while refresh is unavailable.',
    });

    expect(screen.getByText('Tracked items may be stale.')).toBeInTheDocument();
    expect(
      screen.getByText('Showing the most recent tracked product counts while refresh is unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByText('BAT-001')).toBeInTheDocument();
  });

  it('renders a stable skeleton while tracked inventory counts are loading', () => {
    const { container } = render(
      <InventoryDashboardTrackedItemsPanel
        items={[]}
        selectedCount={1}
        isLoading
        warningMessage={null}
        unavailableMessage={null}
        onEdit={vi.fn()}
      />
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(16);
  });

  it('keeps tracked-item rendering out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const trackedPanel = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-tracked-items-panel.tsx'),
      'utf8'
    );

    expect(dashboard).toContain('InventoryDashboardTrackedItemsPanel');
    expect(dashboard).not.toContain('function TrackedItemsList');
    expect(dashboard).not.toContain('function TrackedItemsSkeleton');
    expect(dashboard).not.toContain('function getStockStatus');
    expect(dashboard).not.toContain('STOCK_STATUS_CONFIG');
    expect(trackedPanel).toContain('export function InventoryDashboardTrackedItemsPanel');
    expect(trackedPanel).toContain('function TrackedItemsList');
    expect(trackedPanel).toContain('function TrackedItemsSkeleton');
    expect(trackedPanel).toContain('function getStockStatus');
  });
});
