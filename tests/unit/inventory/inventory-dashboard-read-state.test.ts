import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildInventoryDashboardReadState } from '@/components/domain/inventory/inventory-dashboard-read-state';

describe('buildInventoryDashboardReadState', () => {
  it('builds loading, unavailable, degraded, and sanitized error state for dashboard reads', () => {
    expect(
      buildInventoryDashboardReadState({
        wmsData: undefined,
        dashboardData: { metrics: {} },
        wmsError: new Error('select * from inventory violates tenant policy'),
        dashboardError: new Error('select * from inventory_dashboard timed out'),
        isWmsLoading: false,
        isDashboardLoading: true,
      })
    ).toEqual({
      isLoading: true,
      showWmsUnavailable: true,
      showWmsDegraded: false,
      showDashboardUnavailable: false,
      showDashboardDegraded: true,
      wmsErrorMessage:
        'Inventory dashboard data is temporarily unavailable. Please refresh and try again.',
      dashboardErrorMessage:
        'Inventory dashboard metrics are temporarily unavailable. Please refresh and try again.',
    });
  });

  it('uses retry guidance when no read error is present', () => {
    expect(
      buildInventoryDashboardReadState({
        wmsData: { totals: {} },
        dashboardData: { metrics: {} },
        wmsError: null,
        dashboardError: null,
        isWmsLoading: false,
        isDashboardLoading: false,
      })
    ).toEqual({
      isLoading: false,
      showWmsUnavailable: false,
      showWmsDegraded: false,
      showDashboardUnavailable: false,
      showDashboardDegraded: false,
      wmsErrorMessage: 'Please refresh and try again.',
      dashboardErrorMessage: 'Please refresh and try again.',
    });
  });

  it('keeps read-state derivation out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const readState = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-read-state.ts'),
      'utf8'
    );

    expect(dashboard).toContain('buildInventoryDashboardReadState');
    expect(dashboard).not.toContain('hasUsableWmsData');
    expect(dashboard).not.toContain('hasUsableDashboardData');
    expect(dashboard).not.toContain('getWmsDashboardReadErrorMessage(wmsError)');
    expect(dashboard).not.toContain('getInventoryDashboardReadErrorMessage(dashboardError)');
    expect(readState).toContain('export function buildInventoryDashboardReadState');
    expect(readState).toContain('getWmsDashboardReadErrorMessage(wmsError)');
    expect(readState).toContain('getInventoryDashboardReadErrorMessage(dashboardError)');
  });
});
