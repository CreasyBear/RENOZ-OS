import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('generated report metric validation contract', () => {
  it('keeps unsupported metric validation operator-safe before aggregation', () => {
    const server = read('src/server/functions/reports/scheduled-reports.ts');

    expect(server).toContain('GENERATED_REPORT_METRIC_VALIDATION_MESSAGE');
    expect(server).toContain('const metricsToCalculate = assertGeneratedReportMetrics(data.metrics);');
    expect(server).toContain('function assertGeneratedReportMetrics(metricIds: string[]): string[]');
    expect(server).toContain('function isGeneratedReportMetricId(metricId: string): boolean');
    expect(server).toContain("throw new ValidationError('Selected report metrics are no longer available.'");
    expect(server).toContain('metrics: [GENERATED_REPORT_METRIC_VALIDATION_MESSAGE]');
    expect(server).toContain('calculateMetricsAggregator({');
    expect(server).not.toContain('Invalid metric ID: ${metricId}.');
    expect(server).not.toContain("error instanceof Error ? error.message : 'Unknown error'");
  });

  it('keeps generated-report auth, schema, and deduplicated calculation spine explicit', () => {
    const server = read('src/server/functions/reports/scheduled-reports.ts');

    expect(server).toContain('export const generateReport');
    expect(server).toContain('generateReportSchema');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.dashboard.manageReports })');
    expect(server).toContain('const uniqueMetricIds = Array.from(new Set(metricIds));');
    expect(server).toContain('metricIds: metricsToCalculate');
    expect(server).toContain('metricsToCalculate.map((id) => ({');
  });
});
