import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('CSAT dashboard read-state contract', () => {
  it('keeps CSAT dashboard refresh, stale warnings, and hard errors honest', () => {
    const route = read('src/routes/_authenticated/support/dashboard.tsx');
    const metricsWidget = read('src/components/domain/support/csat/csat-metrics-widget.tsx');
    const lowRatingAlerts = read(
      'src/components/domain/support/csat/csat-low-rating-alerts.tsx'
    );

    expect(route).toContain('refetch: refetchCsatMetrics');
    expect(route).toContain('const csatHardError = csatError && !csatMetrics ? csatError : null');
    expect(route).toContain('Showing the most recent CSAT metrics while refresh is unavailable.');
    expect(route).toContain('void refetch();');
    expect(route).toContain('void refetchCsatMetrics();');
    expect(route).toContain('warningMessage={csatWarning}');
    expect(route).toContain('error={csatHardError}');

    expect(metricsWidget).toContain('warningMessage?: string');
    expect(metricsWidget).toContain('onRetry?: () => void');
    expect(metricsWidget).toContain('Unable to load CSAT metrics');
    expect(metricsWidget).toContain('CSAT refresh unavailable');
    expect(metricsWidget).toContain('Customer satisfaction metrics are temporarily unavailable.');

    expect(lowRatingAlerts).toContain('warningMessage?: string');
    expect(lowRatingAlerts).toContain('onRetry?: () => void');
    expect(lowRatingAlerts).toContain('Unable to load low ratings');
    expect(lowRatingAlerts).toContain('Low-rating refresh unavailable');
    expect(lowRatingAlerts).toContain('Low-rating follow-up alerts are temporarily unavailable.');
  });
});
