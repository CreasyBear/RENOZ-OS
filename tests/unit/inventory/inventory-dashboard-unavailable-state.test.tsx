import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryDashboardUnavailableState } from '@/components/domain/inventory/inventory-dashboard-unavailable-state';

describe('InventoryDashboardUnavailableState', () => {
  it('renders operator-safe cold-load failure copy with retry action', () => {
    const onRetry = vi.fn();

    render(
      <InventoryDashboardUnavailableState
        message="Inventory dashboard data is temporarily unavailable. Please refresh and try again."
        onRetry={onRetry}
      />
    );

    expect(screen.getByText('Failed to load inventory data')).toBeInTheDocument();
    expect(
      screen.getByText('Please try again or contact support if the problem persists.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Inventory dashboard data is temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps cold-load unavailable presentation out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const unavailableState = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-unavailable-state.tsx'),
      'utf8'
    );

    expect(dashboard).toContain('InventoryDashboardUnavailableState');
    expect(dashboard).not.toContain('AlertTriangle');
    expect(dashboard).not.toContain('RefreshCw');
    expect(dashboard).not.toContain("from '@/components/ui/button'");
    expect(dashboard).not.toContain('Failed to load inventory data');
    expect(dashboard).not.toContain('Please try again or contact support if the problem persists.');
    expect(unavailableState).toContain('export function InventoryDashboardUnavailableState');
    expect(unavailableState).toContain('Failed to load inventory data');
    expect(unavailableState).toContain('Retry');
  });
});
