import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { reportsQueryKeys } from '@/lib/query-key-catalog/reports';
import { queryKeys } from '@/lib/query-keys';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('reports query-key catalog contract', () => {
  it('exposes the reports catalog through the public query key adapter', () => {
    expect(queryKeys.reports).toBe(reportsQueryKeys);
  });

  it('keeps reports cache roots in the reports-owned catalog', () => {
    const queryKeysSource = read('src/lib/query-keys.ts');
    const reportsCatalogSource = read('src/lib/query-key-catalog/reports.ts');

    expect(queryKeysSource).toContain("import { reportsQueryKeys } from './query-key-catalog/reports'");
    expect(queryKeysSource).toContain('reports: reportsQueryKeys');
    expect(queryKeysSource).not.toContain('queryKeys.reports');
    expect(reportsCatalogSource).toContain('export interface ReportsScheduledReportsFilters');
    expect(reportsCatalogSource).toContain('export interface ReportsTargetsFilters');
    expect(reportsCatalogSource).toContain('export interface ReportsCustomReportsFilters');
    expect(reportsCatalogSource).not.toContain('queryKeys.reports');
  });

  it('preserves reports tuple shapes for reporting workflows', () => {
    expect(reportsQueryKeys.pipelineForecast('2026-05-01', '2026-05-31', 'week')).toEqual([
      'reports',
      'pipelineForecast',
      '2026-05-01',
      '2026-05-31',
      'week',
    ]);
    expect(reportsQueryKeys.scheduledReports.status('scheduled-report-1')).toEqual([
      'reports',
      'scheduledReports',
      'status',
      'scheduled-report-1',
    ]);
    expect(reportsQueryKeys.targets.progress({ metric: 'revenue' })).toEqual([
      'reports',
      'targets',
      'progress',
      { metric: 'revenue' },
    ]);
    expect(reportsQueryKeys.customReports.results('custom-report-1', { page: 2 })).toEqual([
      'reports',
      'customReports',
      'result',
      'custom-report-1',
      { page: 2 },
    ]);
    expect(reportsQueryKeys.reportFavorites.list({ reportType: 'pipeline-forecast' })).toEqual([
      'reports',
      'reportFavorites',
      'list',
      { reportType: 'pipeline-forecast' },
    ]);
    expect(reportsQueryKeys.financialSummary('2026-05-01', '2026-05-31')).toEqual([
      'reports',
      'financialSummary',
      '2026-05-01',
      '2026-05-31',
      'monthly',
    ]);
  });
});
