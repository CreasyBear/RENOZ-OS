import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryDashboardEmptyState } from '@/components/domain/inventory/inventory-dashboard-empty-state';

describe('InventoryDashboardEmptyState', () => {
  it('renders first-run inventory guidance with setup actions', () => {
    const onReceiveInventory = vi.fn();
    const onSetUpLocations = vi.fn();

    render(
      <InventoryDashboardEmptyState
        onReceiveInventory={onReceiveInventory}
        onSetUpLocations={onSetUpLocations}
      />
    );

    expect(screen.getByText('Welcome to Inventory Management')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Get started by receiving your first inventory shipment or setting up your warehouse locations.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Receive Inventory' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set Up Locations' }));

    expect(onReceiveInventory).toHaveBeenCalledTimes(1);
    expect(onSetUpLocations).toHaveBeenCalledTimes(1);
  });

  it('keeps new-user empty-state presentation out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const emptyState = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-empty-state.tsx'),
      'utf8'
    );

    expect(dashboard).toContain('InventoryDashboardEmptyState');
    expect(dashboard).not.toContain('DataTableEmpty');
    expect(dashboard).not.toContain('Welcome to Inventory Management');
    expect(dashboard).not.toContain('Receive Inventory');
    expect(dashboard).not.toContain('Set Up Locations');
    expect(emptyState).toContain('export function InventoryDashboardEmptyState');
    expect(emptyState).toContain('Welcome to Inventory Management');
    expect(emptyState).toContain('Receive Inventory');
    expect(emptyState).toContain('Set Up Locations');
  });
});
