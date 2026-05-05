import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatReportFavoritesReadError,
  formatScheduledReportsReadError,
} from '@/components/domain/reports/reports-landing-read-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('reports landing read feedback contract', () => {
  it('keeps landing favorites and scheduled read failures behind reports formatters', () => {
    const landing = read('src/components/domain/reports/reports-landing-content.tsx');
    const helper = read('src/components/domain/reports/reports-landing-read-errors.ts');
    const sharedHelper = read('src/components/domain/reports/report-read-errors.ts');
    const favoritesHook = read('src/hooks/reports/use-report-favorites.ts');
    const scheduledHook = read('src/hooks/reports/use-scheduled-reports.ts');

    expect(sharedHelper).toContain('formatReportReadError');
    expect(helper).toContain('formatReportFavoritesReadError');
    expect(helper).toContain('formatScheduledReportsReadError');
    expect(helper).toContain('Report favorites are temporarily unavailable. Please refresh and try again.');
    expect(helper).toContain('Scheduled reports are temporarily unavailable. Please refresh and try again.');
    expect(landing).toContain('formatReportFavoritesReadError(favoritesError)');
    expect(landing).toContain('formatScheduledReportsReadError(scheduledError)');
    expect(landing).not.toContain('favoritesError.message');
    expect(landing).not.toContain('scheduledError.message');
    expect(favoritesHook).toContain('queryKeys.reports.reportFavorites.list(filters)');
    expect(favoritesHook).toContain('normalizeReadQueryError(error, {');
    expect(favoritesHook).toContain("contractType: 'always-shaped'");
    expect(scheduledHook).toContain('queryKeys.reports.scheduledReports.list(filters)');
    expect(scheduledHook).toContain('normalizeReadQueryError(error, {');
    expect(scheduledHook).toContain("contractType: 'always-shaped'");
  });

  it('does not surface unsafe landing read messages', () => {
    expect(
      formatReportFavoritesReadError(
        new Error('postgres duplicate key violates report_favorites_org_idx')
      )
    ).toBe('Report favorites are temporarily unavailable. Please refresh and try again.');

    expect(
      formatScheduledReportsReadError({
        message: 'database constraint violates scheduled_reports_org_idx',
      })
    ).toBe('Scheduled reports are temporarily unavailable. Please refresh and try again.');
  });
});
