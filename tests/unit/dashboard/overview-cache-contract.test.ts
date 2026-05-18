import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dashboardQueryKeys } from '@/lib/query-key-catalog/dashboard';
import { queryKeys } from '@/lib/query-keys';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('dashboard overview cache contract', () => {
  it('exposes the dashboard catalog through the public query key adapter', () => {
    expect(queryKeys.dashboard).toBe(dashboardQueryKeys);
  });

  it('keeps dashboard cache roots in the dashboard-owned catalog', () => {
    const queryKeysSource = read('src/lib/query-keys.ts');
    const dashboardCatalogSource = read('src/lib/query-key-catalog/dashboard.ts');

    expect(queryKeysSource).toContain("import { dashboardQueryKeys } from './query-key-catalog/dashboard'");
    expect(queryKeysSource).toContain('dashboard: dashboardQueryKeys');
    expect(queryKeysSource).not.toContain('queryKeys.dashboard');
    expect(dashboardCatalogSource).toContain('export interface TargetsFilters');
    expect(dashboardCatalogSource).toContain('export interface DashboardMetricsFilters');
    expect(dashboardCatalogSource).not.toContain('queryKeys.dashboard');
  });

  it('centralizes the won-this-month query key under the dashboard overview family', () => {
    expect(queryKeys.dashboard.overview()).toEqual(['dashboard', 'overview']);
    expect(queryKeys.dashboard.overviewWonThisMonth('2026-05-01', '2026-05-31')).toEqual([
      'dashboard',
      'overview',
      'wonThisMonth',
      '2026-05-01',
      '2026-05-31',
    ]);

    const container = read('src/components/domain/dashboard/overview/overview-container.tsx');

    expect(container).toContain('queryKeys.dashboard.overviewWonThisMonth(');
    expect(container).not.toContain("queryKey: [\n      'dashboard',\n      'overview',");
  });

  it('preserves dashboard metrics, target, scheduled-report, and layout tuple shapes', () => {
    expect(dashboardQueryKeys.metrics.summary({ metrics: ['revenue'] })).toEqual([
      'dashboard',
      'metrics',
      'summary',
      { metrics: ['revenue'] },
    ]);
    expect(dashboardQueryKeys.targets.progress({ includeCompleted: true })).toEqual([
      'dashboard',
      'targets',
      'progress',
      { includeCompleted: true },
    ]);
    expect(dashboardQueryKeys.scheduledReports.status('scheduled-report-1')).toEqual([
      'dashboard',
      'scheduledReports',
      'status',
      'scheduled-report-1',
    ]);
    expect(dashboardQueryKeys.layouts.userLayout()).toEqual([
      'dashboard',
      'layouts',
      'userLayout',
    ]);
  });
});
