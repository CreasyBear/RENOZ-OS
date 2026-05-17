import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ComponentProps, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryDashboardRecentMovementsPanel } from '@/components/domain/inventory/inventory-dashboard-recent-movements-panel';
import type { RecentMovement } from '@/hooks/inventory';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: ReactNode;
    to: string;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

function movement(overrides: Partial<RecentMovement>): RecentMovement {
  return {
    id: overrides.id ?? 'movement-1',
    type: overrides.type ?? 'receipt',
    timestamp: overrides.timestamp ?? '2026-05-18T01:00:00.000Z',
    description: overrides.description ?? 'Movement',
    reference: overrides.reference ?? 'PO-100',
    quantity: overrides.quantity ?? 5,
    productName: overrides.productName ?? 'Battery Module',
    productSku: overrides.productSku ?? 'BAT-001',
    location: overrides.location ?? 'Main Warehouse',
    toLocation: overrides.toLocation ?? null,
  };
}

function renderPanel(
  props: Partial<ComponentProps<typeof InventoryDashboardRecentMovementsPanel>> = {}
) {
  render(
    <InventoryDashboardRecentMovementsPanel
      movements={[movement({})]}
      isLoading={false}
      showUnavailable={false}
      showDegraded={false}
      readErrorMessage="Movement read failed"
      {...props}
    />
  );
}

describe('InventoryDashboardRecentMovementsPanel', () => {
  it('renders the recent movement frame and links to inventory analytics', () => {
    renderPanel();

    expect(screen.getByText('Recent Movements')).toBeInTheDocument();
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View All/ })).toHaveAttribute(
      'href',
      '/inventory/analytics'
    );
    expect(screen.getByText('Received PO-100: 5 units (1 SKU)')).toBeInTheDocument();
  });

  it('shows unavailable copy instead of a fake empty timeline when movement reads fail cold', () => {
    renderPanel({
      movements: [],
      showUnavailable: true,
      readErrorMessage: 'Inventory dashboard data is temporarily unavailable.',
    });

    expect(screen.getByText('Recent movements are temporarily unavailable.')).toBeInTheDocument();
    expect(
      screen.getByText('Inventory dashboard data is temporarily unavailable.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No recent activity')).not.toBeInTheDocument();
  });

  it('keeps stale warnings visible while cached recent movements remain visible', () => {
    renderPanel({
      showDegraded: true,
      readErrorMessage: 'Showing cached WMS movements.',
    });

    expect(screen.getByText('Recent movements may be stale.')).toBeInTheDocument();
    expect(screen.getByText('Showing cached WMS movements.')).toBeInTheDocument();
    expect(screen.getByText('Received PO-100: 5 units (1 SKU)')).toBeInTheDocument();
  });

  it('renders a stable skeleton while WMS movements are loading', () => {
    const { container } = render(
      <InventoryDashboardRecentMovementsPanel
        movements={[]}
        isLoading
        showUnavailable={false}
        showDegraded={false}
        readErrorMessage="Loading"
      />
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(30);
  });

  it('keeps recent-movement card composition out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const recentPanel = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-recent-movements-panel.tsx'),
      'utf8'
    );

    expect(dashboard).toContain('InventoryDashboardRecentMovementsPanel');
    expect(dashboard).not.toContain('InventoryDashboardMovementsTimeline');
    expect(dashboard).not.toContain('InventoryDashboardMovementsSkeleton');
    expect(dashboard).not.toContain('Recent movements are temporarily unavailable.');
    expect(dashboard).not.toContain('Recent movements may be stale.');
    expect(recentPanel).toContain('export function InventoryDashboardRecentMovementsPanel');
    expect(recentPanel).toContain('InventoryDashboardMovementsTimeline');
    expect(recentPanel).toContain('InventoryDashboardMovementsSkeleton');
  });
});
