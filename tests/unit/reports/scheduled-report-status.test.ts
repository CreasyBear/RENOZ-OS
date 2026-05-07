import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deriveScheduledReportStatus } from '@/lib/reports/scheduled-report-status';

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('scheduled report status derivation', () => {
  it('marks reports without runs as pending', () => {
    expect(deriveScheduledReportStatus({ lastRunAt: null })).toEqual({
      lastRunStatus: 'pending',
      lastRunMessage: 'Report has not run yet.',
    });
  });

  it('derives failed status from the latest error fields', () => {
    expect(
      deriveScheduledReportStatus({
        lastRunAt: '2026-05-07T12:00:00.000Z',
        lastSuccessAt: '2026-05-06T12:00:00.000Z',
        lastErrorAt: '2026-05-07T12:00:01.000Z',
        lastError: 'SMTP delivery failed',
      })
    ).toEqual({
      lastRunStatus: 'failed',
      lastRunMessage: 'SMTP delivery failed',
    });
  });

  it('derives success status from the latest success fields', () => {
    expect(
      deriveScheduledReportStatus({
        lastRunAt: '2026-05-07T12:00:00.000Z',
        lastSuccessAt: '2026-05-07T12:00:01.000Z',
        lastErrorAt: '2026-05-06T12:00:00.000Z',
        lastError: 'Previous failure',
      })
    ).toEqual({
      lastRunStatus: 'success',
      lastRunMessage: 'Last scheduled report run completed successfully.',
    });
  });

  it('uses running when a run exists without an outcome yet', () => {
    expect(
      deriveScheduledReportStatus({
        lastRunAt: '2026-05-07T12:00:00.000Z',
        lastSuccessAt: null,
        lastErrorAt: null,
      })
    ).toEqual({
      lastRunStatus: 'running',
      lastRunMessage: 'Scheduled report run is in progress.',
    });
  });

  it('wires status endpoint to persisted outcome fields instead of null placeholders', () => {
    const source = read('src/server/functions/reports/scheduled-reports.ts');

    expect(source).toContain("import { deriveScheduledReportStatus } from '@/lib/reports/scheduled-report-status';");
    expect(source).toContain('lastSuccessAt: scheduledReports.lastSuccessAt');
    expect(source).toContain('lastErrorAt: scheduledReports.lastErrorAt');
    expect(source).toContain('lastError: scheduledReports.lastError');
    expect(source).toContain('const { lastRunStatus, lastRunMessage } = deriveScheduledReportStatus(report);');
    expect(source).not.toContain('lastRunStatus: null');
    expect(source).not.toContain('lastRunMessage: null');
    expect(source).not.toContain('TODO(PHASE12-004)');
  });
});
