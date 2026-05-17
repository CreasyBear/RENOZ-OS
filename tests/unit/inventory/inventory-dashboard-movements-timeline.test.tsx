import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  InventoryDashboardMovementsSkeleton,
  InventoryDashboardMovementsTimeline,
} from '@/components/domain/inventory/inventory-dashboard-movements-timeline';
import type { RecentMovement } from '@/hooks/inventory';

function movement(overrides: Partial<RecentMovement>): RecentMovement {
  return {
    id: overrides.id ?? 'movement-1',
    type: overrides.type ?? 'receipt',
    timestamp: overrides.timestamp ?? '2026-05-18T01:00:00.000Z',
    description: overrides.description ?? 'Movement',
    reference: overrides.reference ?? null,
    quantity: overrides.quantity ?? 1,
    productName: overrides.productName ?? 'Battery Module',
    productSku: overrides.productSku ?? 'BAT-001',
    location: overrides.location ?? 'Main Warehouse',
    toLocation: overrides.toLocation ?? null,
  };
}

describe('InventoryDashboardMovementsTimeline', () => {
  it('aggregates related receipt movements into a single operator activity', () => {
    render(
      <InventoryDashboardMovementsTimeline
        movements={[
          movement({
            id: 'movement-a',
            reference: 'PO-100',
            quantity: 2,
            productSku: 'BAT-A',
          }),
          movement({
            id: 'movement-b',
            reference: 'PO-100',
            quantity: 3,
            productSku: 'BAT-B',
            timestamp: '2026-05-18T01:05:00.000Z',
          }),
        ]}
      />
    );

    expect(screen.getByText('Received PO-100: 5 units (2 SKUs)')).toBeInTheDocument();
    expect(screen.getByText('BAT-A, BAT-B')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('marks outbound allocation activity with a negative quantity badge', () => {
    render(
      <InventoryDashboardMovementsTimeline
        movements={[
          movement({
            type: 'allocation',
            reference: 'ORD-42',
            quantity: 4,
            productSku: 'BAT-A',
          }),
        ]}
      />
    );

    expect(screen.getByText('Allocated for ORD-42: 4 units (1 SKU)')).toBeInTheDocument();
    expect(screen.getByText('-4')).toBeInTheDocument();
  });

  it('renders an honest empty state when there are no recent movements', () => {
    render(<InventoryDashboardMovementsTimeline movements={[]} />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('renders a stable movement skeleton while the WMS dashboard is loading', () => {
    const { container } = render(<InventoryDashboardMovementsSkeleton />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(30);
  });

  it('keeps movement aggregation and timeline formatting out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const movementsTimeline = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-movements-timeline.tsx'),
      'utf8'
    );
    const recentPanel = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-recent-movements-panel.tsx'),
      'utf8'
    );

    expect(dashboard).toContain('InventoryDashboardRecentMovementsPanel');
    expect(dashboard).not.toContain('InventoryDashboardMovementsTimeline');
    expect(dashboard).not.toContain('InventoryDashboardMovementsSkeleton');
    expect(dashboard).not.toContain('function aggregateMovementsIntoActivities');
    expect(dashboard).not.toContain('function formatActivityDescription');
    expect(dashboard).not.toContain('const movementIcons');
    expect(dashboard).not.toContain('groupMovementsByDate');
    expect(recentPanel).toContain('InventoryDashboardMovementsTimeline');
    expect(recentPanel).toContain('InventoryDashboardMovementsSkeleton');
    expect(movementsTimeline).toContain('export function InventoryDashboardMovementsTimeline');
    expect(movementsTimeline).toContain('export function InventoryDashboardMovementsSkeleton');
    expect(movementsTimeline).toContain('function aggregateMovementsIntoActivities');
  });
});
