import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatWinLossAnalysisReadError } from '@/components/domain/reports/win-loss-report-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('win/loss read feedback contract', () => {
  it('keeps win/loss cached read failures behind a reports formatter', () => {
    const container = read('src/components/domain/reports/win-loss-analysis-container.tsx');
    const helper = read('src/components/domain/reports/win-loss-report-errors.ts');
    const sharedHelper = read('src/components/domain/reports/report-read-errors.ts');
    const hook = read('src/hooks/reports/use-win-loss.ts');

    expect(sharedHelper).toContain('formatReportReadError');
    expect(helper).toContain('formatWinLossAnalysisReadError');
    expect(helper).toContain('Win/loss analysis is temporarily unavailable. Please refresh and try again.');
    expect(container).toContain('formatWinLossAnalysisReadError(readError)');
    expect(container).toContain('const readError = analysisQuery.error ?? competitorsQuery.error;');
    expect(container).toContain('<span>{readErrorMessage}</span>');
    expect(container).not.toContain("(analysisQuery.error ?? competitorsQuery.error)?.message");
    expect(hook).toContain('useWinLossAnalysis');
    expect(hook).toContain('useCompetitors');
    expect(hook).toContain('queryKeys.reports.winLossAnalysis(dateFromStr, dateToStr)');
    expect(hook).toContain('queryKeys.reports.competitors(dateFromStr, dateToStr)');
    expect(hook).toContain('normalizeReadQueryError(error, {');
    expect(hook).toContain("contractType: 'always-shaped'");
  });

  it('does not surface unsafe win/loss read messages', () => {
    expect(
      formatWinLossAnalysisReadError(
        new Error('postgres duplicate key violates win_loss_analysis_org_idx')
      )
    ).toBe('Win/loss analysis is temporarily unavailable. Please refresh and try again.');

    expect(
      formatWinLossAnalysisReadError({
        message: 'Win/loss analysis is temporarily unavailable. Please refresh and try again.',
      })
    ).toBe('Win/loss analysis is temporarily unavailable. Please refresh and try again.');
  });
});
