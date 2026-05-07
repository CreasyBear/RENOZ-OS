import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_ERROR_MESSAGES,
  getDashboardErrorMessage,
} from '@/components/domain/dashboard/dashboard-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('dashboard feedback contract', () => {
  it('formats dashboard display errors without leaking unsafe internals', () => {
    expect(
      getDashboardErrorMessage(
        new Error('select from dashboard query violates row level security policy'),
        'chartData'
      )
    ).toBe(DASHBOARD_ERROR_MESSAGES.chartData);

    expect(
      getDashboardErrorMessage(
        { statusCode: 429, message: 'Too many dashboard requests' },
        'widgets'
      )
    ).toBe('Too many requests. Please wait a moment and try again.');
  });

  it('keeps dashboard display errors behind the domain helper', () => {
    const sources = [
      'src/components/domain/dashboard/widgets/chart-widget.tsx',
      'src/components/domain/dashboard/widgets/activity-feed-widget.tsx',
      'src/components/domain/dashboard/widgets/kpi-widget.tsx',
      'src/components/domain/dashboard/widgets/ai-insights-widget.tsx',
      'src/components/domain/dashboard/target-progress.tsx',
      'src/components/domain/dashboard/drill-down-modal.tsx',
      'src/components/domain/dashboard/mobile/mobile-dashboard.tsx',
      'src/components/domain/dashboard/dashboard-grid.tsx',
    ].map(read);

    for (const source of sources) {
      expect(source).toContain('getDashboardErrorMessage(error,');
      expect(source).not.toContain('error.message ||');
      expect(source).not.toContain('{error.message}');
      expect(source).not.toContain('<span>{error.message}</span>');
    }
  });
});
