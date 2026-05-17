import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { refreshInventoryDashboard } from '@/components/domain/inventory/inventory-dashboard-refresh';

describe('refreshInventoryDashboard', () => {
  it('refreshes every dashboard read source before showing success feedback', async () => {
    const calls: string[] = [];
    const refetchWMS = vi.fn(async () => {
      calls.push('wms');
    });
    const refetchDashboard = vi.fn(async () => {
      calls.push('dashboard');
    });
    const refetchMovements = vi.fn(async () => {
      calls.push('movements');
    });
    const refetchAlerts = vi.fn(async () => {
      calls.push('alerts');
    });
    const notifySuccess = vi.fn((message: string) => {
      calls.push(`success:${message}`);
    });

    await refreshInventoryDashboard({
      refetchWMS,
      refetchDashboard,
      refetchMovements,
      refetchAlerts,
      notifySuccess,
    });

    expect(refetchWMS).toHaveBeenCalledTimes(1);
    expect(refetchDashboard).toHaveBeenCalledTimes(1);
    expect(refetchMovements).toHaveBeenCalledTimes(1);
    expect(refetchAlerts).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledWith('Dashboard refreshed');
    expect(calls).toEqual([
      'wms',
      'dashboard',
      'movements',
      'alerts',
      'success:Dashboard refreshed',
    ]);
  });

  it('does not show success feedback when any dashboard refresh fails', async () => {
    const notifySuccess = vi.fn();

    await expect(
      refreshInventoryDashboard({
        refetchWMS: vi.fn(async () => undefined),
        refetchDashboard: vi.fn(async () => {
          throw new Error('dashboard refresh failed');
        }),
        refetchMovements: vi.fn(async () => undefined),
        refetchAlerts: vi.fn(async () => undefined),
        notifySuccess,
      })
    ).rejects.toThrow('dashboard refresh failed');

    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('keeps refresh coordination out of the unified dashboard presenter', () => {
    const root = process.cwd();
    const dashboard = readFileSync(
      join(root, 'src/components/domain/inventory/unified-inventory-dashboard.tsx'),
      'utf8'
    );
    const refresh = readFileSync(
      join(root, 'src/components/domain/inventory/inventory-dashboard-refresh.ts'),
      'utf8'
    );

    expect(dashboard).toContain('refreshInventoryDashboard');
    expect(dashboard).not.toContain('Promise.all');
    expect(dashboard).not.toContain("'Dashboard refreshed'");
    expect(refresh).toContain('export async function refreshInventoryDashboard');
    expect(refresh).toContain('Promise.all');
    expect(refresh).toContain("'Dashboard refreshed'");
  });
});
